# Chrome 商店发布准备与文件重组计划

## 1. 目标
为 Chrome 商店发布做准备，将项目文件分为 **"发布制品" (Production Assets)** 和 **"开发文档" (Development Docs)** 两类。确保打包时干净整洁，同时保留完整的开发历史。

## 2. 文件夹重组策略

### A. 新建 `dev_docs` 文件夹
将所有非代码的过程性文档移动到 `dev_docs` 文件夹中。这将作为我们未来的“知识库”。
*   **移动对象**:
    *   `Learning from voyager.md`
    *   `Project_Review_Timeline.md`
    *   `todo.json`
    *   `docs/` (包含 planning, findings 等)
    *   `.trae/documents/` (虽然这些通常不被打包，但手动整理一下更清晰，或者保持不动，但这里我们主要是整理根目录)
    *   `document.js` (如果这是废弃文件)
    *   `notebooklm-folder-extension.zip`, `notebooklm_folder_manager.zip` (旧的压缩包)

### B. 保留核心发布文件 (Root Level)
这些文件必须留在根目录，或者是构建扩展所必需的。
*   `manifest.json` (核心)
*   `content_notebooklm.js`, `content_gemini.js` (业务逻辑)
*   `timeline.js`, `timeline_gemini.js` (业务逻辑)
*   `popup.html`, `popup.js` (插件 UI)
*   `styles.css` (样式)
*   `icon.png` (如果有)
*   `README.md` (商店介绍通常需要，也作为项目门面)
*   `CHANGELOG.md` (版本记录，建议保留在根目录以便查阅，发布时可选择性忽略，或者一起打包也无妨)

## 3. 打包脚本 (Optional but Recommended)
创建一个简单的打包脚本 `package.sh` (放在 `dev_docs` 或根目录但 `.gitignore` 掉)，用于自动排除非必要文件并生成 zip 包。
*   命令示例: `zip -r release_v3.0.0.15.zip . -x "*.git*" -x "dev_docs/*" -x ".trae/*" -x "*.DS_Store"`

## 4. 执行步骤
1.  创建 `dev_docs` 目录。
2.  将 `docs` 文件夹移动到 `dev_docs/` 下。
3.  将根目录下的 `Learning from voyager.md`, `Project_Review_Timeline.md`, `todo.json`, `document.js`, 及旧 zip 包移动到 `dev_docs/`。
4.  检查 `README.md`，确保它指向新的文档位置（如果有链接的话）。
5.  创建一个 `package_extension.sh` 脚本，方便一键打包。

## 5. 预期结构
```
/Notebooklm 文件夹工具/
  ├── manifest.json
  ├── content_notebooklm.js
  ├── content_gemini.js
  ├── timeline.js
  ├── timeline_gemini.js
  ├── styles.css
  ├── popup.html
  ├── popup.js
  ├── README.md
  ├── CHANGELOG.md
  ├── package_extension.sh (新)
  └── dev_docs/  <-- 所有过程性文件归档于此
      ├── Project_Review_Timeline.md
      ├── Learning from voyager.md
      ├── todo.json
      ├── old_zips/
      └── planning/
```
