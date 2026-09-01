## Maven资源过滤导致Excel模板损坏问题分析及规范

### 一、问题现象

同事在`pom.xml`中添加了以下配置后，项目中的Excel模板导出时出现解析错误：

```xml
<nonFilteredFileExtensions>
    <nonFilteredFileExtension>docx</nonFilteredFileExtension>
    <nonFilteredFileExtension>doc</nonFilteredFileExtension>
</nonFilteredFileExtensions>
```

**问题表现**：
- Excel模板文件通过接口下载后无法打开，提示文件损坏
- 下载的文件大小与`resources`目录下的原始文件不一致
- 代码中读取模板时抛出`InvalidFormatException`或`ZipException`

### 二、根本原因分析

#### 2.1 Maven资源过滤机制

当Maven的`resources`插件开启`<filtering>true</filtering>`时，会扫描并替换资源文件中的`${xxx}`占位符。`xlsx`和`docx`文件本质上是ZIP压缩包，属于**二进制文件**，被当作文本文件处理会导致其内部结构被破坏。

#### 2.2 本次问题的直接原因

| 配置项 | 作用 | 问题所在 |
|--------|------|----------|
| `docx` / `doc` | 保护Word文件不被过滤 | ✅ 已配置 |
| `xlsx` / `xls` | 保护Excel文件不被过滤 | ❌ **未配置** |

同事只配置了Word文件的白名单，但项目实际需要导出**Excel模板**，由于`xlsx`不在排除列表中，Maven构建时对其进行了过滤，导致文件损坏。Apache官方JIRA和Stack Overflow上有大量类似案例记录。

### 三、技术规范与配置标准

#### 3.1 必须配置的非过滤文件类型

项目中的**所有二进制文件**都应加入白名单：

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-resources-plugin</artifactId>
    <configuration>
        <nonFilteredFileExtensions>
            <!-- Office文档 -->
            <nonFilteredFileExtension>xlsx</nonFilteredFileExtension>
            <nonFilteredFileExtension>xls</nonFilteredFileExtension>
            <nonFilteredFileExtension>docx</nonFilteredFileExtension>
            <nonFilteredFileExtension>doc</nonFilteredFileExtension>
            <!-- 字体文件 -->
            <nonFilteredFileExtension>ttf</nonFilteredFileExtension>
            <nonFilteredFileExtension>woff</nonFilteredFileExtension>
            <nonFilteredFileExtension>woff2</nonFilteredFileExtension>
            <!-- 证书/密钥 -->
            <nonFilteredFileExtension>pfx</nonFilteredFileExtension>
            <nonFilteredFileExtension>jks</nonFilteredFileExtension>
            <!-- 图片 -->
            <nonFilteredFileExtension>png</nonFilteredFileExtension>
            <nonFilteredFileExtension>jpg</nonFilteredFileExtension>
            <!-- 其他二进制 -->
            <nonFilteredFileExtension>pdf</nonFilteredFileExtension>
            <nonFilteredFileExtension>zip</nonFilteredFileExtension>
        </nonFilteredFileExtensions>
    </configuration>
</plugin>
```

#### 3.2 最佳实践：白名单模式

更推荐的方案是采用**白名单模式**：默认关闭所有过滤，只对明确需要变量替换的配置文件（如`application.properties`、`application.yml`）开启过滤：

```xml
<build>
    <resources>
        <!-- 默认关闭过滤 -->
        <resource>
            <directory>src/main/resources</directory>
            <filtering>false</filtering>
            <includes>
                <include>**/*</include>
            </includes>
        </resource>
        <!-- 只对配置文件开启过滤 -->
        <resource>
            <directory>src/main/resources</directory>
            <filtering>true</filtering>
            <includes>
                <include>**/*.properties</include>
                <include>**/*.yml</include>
                <include>**/*.yaml</include>
            </includes>
        </resource>
    </resources>
</build>
```

这种方式的优势是**安全性更高**，新加入的二进制文件不会被意外过滤。

### 四、配置规范要点

| 要点 | 说明 |
|------|------|
| **完整性** | 项目中所有二进制文件扩展名都必须配置，不可遗漏 |
| **大小写** | 扩展名区分大小写，需同时配置`xlsx`和`XLSX`等变体 |
| **版本要求** | `maven-resources-plugin`版本需≥2.3才支持此配置 |
| **子模块继承** | 子模块不会自动继承父模块的`nonFilteredFileExtensions`配置，需在各子模块单独配置 |
| **验证方法** | 构建后解压jar包，检查`target`目录下的二进制文件是否能正常打开 |

### 五、问题修复步骤

1. **补充配置**：在`nonFilteredFileExtensions`中添加`xlsx`和`xls`
2. **清理构建**：执行`mvn clean package`重新构建
3. **验证修复**：解压`target`目录下的jar包，确认Excel模板文件未被损坏
4. **回归测试**：验证Excel导出功能恢复正常