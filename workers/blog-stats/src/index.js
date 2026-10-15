// [AGC:FILE] tool=Cc author=fangkun date=2026-10-15
// [AGC:START] tool=Cc author=fangkun
/**
 * 博客阅读量统计 Worker
 *
 * 功能：
 * - 记录每篇文章的 PV（总访问）和 UV（独立访客）
 * - 支持批量查询多篇文章的阅读量
 * - 支持获取站点总访问量
 *
 * 数据存储：Cloudflare KV
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS 处理
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      // 记录单篇文章访问
      if (path === '/api/views' && request.method === 'POST') {
        const { page } = await request.json()
        if (!page) {
          return new Response(JSON.stringify({ error: 'page required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const stats = await incrementPageView(env.STATS_KV, page, request)
        return new Response(JSON.stringify({ success: true, data: stats }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 批量查询多篇文章阅读量
      if (path === '/api/views/batch' && request.method === 'POST') {
        const { pages } = await request.json()
        if (!Array.isArray(pages)) {
          return new Response(JSON.stringify({ error: 'pages array required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const results = await batchQuery(env.STATS_KV, pages)
        return new Response(JSON.stringify({ success: true, data: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 获取站点总访问量
      if (path === '/api/summary' && request.method === 'GET') {
        const summary = await getSiteSummary(env.STATS_KV)
        return new Response(JSON.stringify({ success: true, data: summary }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders })
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  },
}

/**
 * 增加页面访问量
 * @param {KVNamespace} kv - Cloudflare KV namespace
 * @param {string} page - 页面路径
 * @param {Request} request - 请求对象
 */
async function incrementPageView(kv, page, request) {
  const key = `page:${page}`
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown'

  // 获取现有数据
  let data = await kv.get(key, 'json')
  if (!data) {
    data = { pv: 0, uv: 0, visitors: [] }
  }

  // 增加 PV
  data.pv += 1

  // 检查 UV（同一 IP 24小时内只算一次）
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000

  // 清理过期访客
  data.visitors = data.visitors.filter(v => now - v.time < oneDay)

  // 检查是否已访问
  const hasVisited = data.visitors.some(v => v.ip === clientIP)
  if (!hasVisited) {
    data.visitors.push({ ip: clientIP, time: now })
    data.uv += 1

    // 限制访客记录数量，避免 KV 存储过大
    if (data.visitors.length > 1000) {
      data.visitors = data.visitors.slice(-1000)
    }
  }

  // 保存数据
  await kv.put(key, JSON.stringify(data))

  // 更新站点总统计
  await updateSiteStats(kv, data.pv, data.uv)

  return { pv: data.pv, uv: data.uv }
}

/**
 * 批量查询页面阅读量
 * @param {KVNamespace} kv - Cloudflare KV namespace
 * @param {string[]} pages - 页面路径数组
 */
async function batchQuery(kv, pages) {
  const results = {}

  for (const page of pages) {
    const key = `page:${page}`
    const data = await kv.get(key, 'json')
    if (data) {
      results[page] = { pv: data.pv, uv: data.uv }
    } else {
      results[page] = { pv: 0, uv: 0 }
    }
  }

  return results
}

/**
 * 获取站点总访问量
 * @param {KVNamespace} kv - Cloudflare KV namespace
 */
async function getSiteSummary(kv) {
  const summaryKey = 'site:summary'
  let summary = await kv.get(summaryKey, 'json')

  if (!summary) {
    summary = { totalPV: 0, totalUV: 0, pages: 0 }
  }

  return summary
}

/**
 * 更新站点统计
 * @param {KVNamespace} kv - Cloudflare KV namespace
 * @param {number} pagePV - 当前页面 PV
 * @param {number} pageUV - 当前页面 UV
 */
async function updateSiteStats(kv, pagePV, pageUV) {
  const summaryKey = 'site:summary'
  let summary = await kv.get(summaryKey, 'json')

  if (!summary) {
    // 首次初始化，需要遍历所有页面
    summary = await calculateTotalStats(kv)
  }

  // 简单增量更新（假设每次只增加 1）
  summary.totalPV += 1
  // UV 的增量更新比较复杂，这里简化处理
  // 实际 UV 应该由定时任务重新计算

  await kv.put(summaryKey, JSON.stringify(summary))
}

/**
 * 计算总统计（初始化或校准用）
 * @param {KVNamespace} kv - Cloudflare KV namespace
 */
async function calculateTotalStats(kv) {
  const list = await kv.list({ prefix: 'page:' })
  let totalPV = 0
  let totalUV = 0

  for (const key of list.keys) {
    const data = await kv.get(key.name, 'json')
    if (data) {
      totalPV += data.pv || 0
      totalUV += data.uv || 0
    }
  }

  return {
    totalPV,
    totalUV,
    pages: list.keys.length,
    lastUpdated: Date.now(),
  }
}
// [AGC:END]
