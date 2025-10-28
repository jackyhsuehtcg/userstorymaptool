# 多语系 (i18n) 使用指南

## 概述

本项目使用 `react-i18next` 实现多语系支持。支持三种语言：

- **English (en-US)** - 英文
- **中文（简体）(zh-CN)** - 简体中文
- **繁體中文 (zh-TW)** - 繁体中文

## 架构

### 目录结构

```
frontend/
├── public/
│   └── locales/          # 翻译文件目录
│       ├── en-US/        # 英文翻译
│       ├── zh-CN/        # 简体中文翻译
│       └── zh-TW/        # 繁体中文翻译
│           ├── ui.json       # UI 组件翻译
│           ├── team.json     # 团队相关翻译
│           └── messages.json # 通知和消息翻译
├── src/
│   ├── i18n.ts          # i18next 配置文件
│   ├── hooks/
│   │   └── useI18n.ts   # 自定义翻译 hook（带 fallback）
│   └── components/
│       ├── LanguageSwitcher.tsx  # 语言切换器组件
│       └── ... 其他组件
```

### 命名空间 (Namespaces)

翻译被组织为三个命名空间：

1. **ui** - 用户界面文本（按钮、标签、占位符等）
2. **team** - 团队相关文本（团队状态、成员角色等）
3. **messages** - 通知、错误、确认和验证消息

## 使用方法

### 基础用法

在组件中使用翻译：

```typescript
import { useTranslation } from 'react-i18next';

export const MyComponent: React.FC = () => {
  const { t } = useTranslation('ui'); // 使用 'ui' 命名空间

  return <button>{t('buttons.ok')}</button>;
};
```

### 使用多个命名空间

```typescript
const { t } = useTranslation(['ui', 'messages']);

return (
  <>
    <h1>{t('ui:appTitle')}</h1>
    <button>{t('messages:buttons.ok')}</button>
  </>
);
```

### 访问其他命名空间的翻译

```typescript
const { t } = useTranslation('ui');

// 使用命名空间前缀访问其他命名空间
const message = t('messages:errors.loadFailed');
```

### 动态翻译 (Interpolation)

翻译文件：

```json
{
  "greeting": "Hello {{name}}, welcome to {{appName}}"
}
```

使用：

```typescript
const greeting = t('greeting', {
  name: 'John',
  appName: 'Story Map Tool'
});
```

### 条件翻译 (Pluralization)

翻译文件：

```json
{
  "nodes_one": "1 node",
  "nodes_other": "{{count}} nodes"
}
```

使用：

```typescript
const text = t('nodes', { count: 5 }); // "5 nodes"
```

### 使用自定义 Hook（带 Fallback）

```typescript
import { useI18n } from '../hooks/useI18n';

export const MyComponent: React.FC = () => {
  const { t } = useI18n('ui');

  // 如果翻译缺失，会打印警告
  const text = t('nonExistent.key', 'Default value');

  return <p>{text}</p>;
};
```

## 语言检测和切换

### 自动检测

应用启动时会自动检测用户语言，优先级顺序：

1. **localStorage** - 用户之前选择的语言
2. **浏览器语言** - 从浏览器设置检测
3. **HTML 标签** - 从 `<html lang="...">` 检测
4. **默认** - 英文 (en-US)

### 手动切换语言

使用 `LanguageSwitcher` 组件：

```typescript
import { LanguageSwitcher } from './components/LanguageSwitcher';

export const Toolbar: React.FC = () => {
  return (
    <div className="toolbar">
      <LanguageSwitcher />
    </div>
  );
};
```

或者手动切换：

```typescript
import { useTranslation } from 'react-i18next';

export const MyComponent: React.FC = () => {
  const { i18n } = useTranslation();

  const handleChangeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <button onClick={() => handleChangeLanguage('zh-CN')}>
      切换到中文
    </button>
  );
};
```

## 添加新的翻译

### 步骤 1：在所有语言的 JSON 文件中添加翻译

**public/locales/en-US/ui.json:**

```json
{
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}
```

**public/locales/zh-CN/ui.json:**

```json
{
  "newFeature": {
    "title": "新功能",
    "description": "这是一个新功能"
  }
}
```

**public/locales/zh-TW/ui.json:**

```json
{
  "newFeature": {
    "title": "新功能",
    "description": "這是一個新功能"
  }
}
```

### 步骤 2：在组件中使用

```typescript
const { t } = useTranslation('ui');

return (
  <div>
    <h2>{t('newFeature.title')}</h2>
    <p>{t('newFeature.description')}</p>
  </div>
);
```

## Fallback 策略

当翻译缺失时，i18next 会按以下顺序查找：

1. **当前语言的命名空间** - 例如：zh-CN/ui.json
2. **当前语言的 fallback 命名空间** - 例如：ui（来自 defaultNS）
3. **Fallback 语言** - en-US（来自 fallbackLng）
4. **最后使用翻译 Key 本身** - 例如："ui:buttons.ok"

配置位置：`src/i18n.ts`

```typescript
i18n.init({
  fallbackLng: 'en-US',    // Fallback 语言
  fallbackNS: 'ui',        // Fallback 命名空间
  defaultNS: 'ui',         // 默认命名空间
  // ...
});
```

## 缺失翻译警告

当使用自定义 `useI18n` hook 时，缺失的翻译会在浏览器控制台打印警告：

```
Warning: Translation missing: ui:buttons.unknownKey in language en-US
```

## 导出 Locale 文件

当构建生产版本时，Vite 会自动将 `public/locales` 目录中的文件复制到 `dist/` 目录：

```
dist/
├── locales/
│   ├── en-US/
│   ├── zh-CN/
│   └── zh-TW/
```

## 性能优化

1. **按需加载** - 翻译文件通过 HTTP Backend 按需加载，不会全部打包到 JS bundle
2. **缓存** - i18next 会缓存已加载的翻译文件
3. **Suspense** - 设置 `useSuspense: false` 以避免加载阻塞

## 测试翻译

### 在开发中测试

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 使用 LanguageSwitcher 切换语言

3. 检查浏览器控制台是否有警告信息

### 添加缺失的翻译

如果看到缺失翻译的警告，请：

1. 找到相应的命名空间文件
2. 添加缺失的翻译 Key
3. 在所有语言中保持一致的结构

## 常见问题 (FAQ)

### Q：如何处理动态内容的翻译？

A：使用 Interpolation：

```typescript
const message = t('greeting', { name: 'John' });
```

### Q：如何翻译 HTML 内容？

A：使用 Trans 组件（如需要）：

```typescript
import { Trans } from 'react-i18next';

<Trans i18nKey="description.part1">
  Click <button>here</button> to start.
</Trans>
```

### Q：如何缓存翻译？

A：i18next 会自动在 localStorage 中保存用户选择的语言。

### Q：支持多少个语言？

A：可以支持任意数量的语言，只需：

1. 在 `public/locales/` 中添加新目录
2. 创建必要的 JSON 文件
3. 在 `src/i18n.ts` 的 `supportedLngs` 中注册
4. 更新 `SUPPORTED_LANGUAGES` 对象

## 相关文件

- **i18n 配置**: `src/i18n.ts`
- **自定义 Hook**: `src/hooks/useI18n.ts`
- **语言切换器**: `src/components/LanguageSwitcher.tsx`
- **翻译文件**: `public/locales/{lng}/{ns}.json`

## 参考资源

- [react-i18next 文档](https://react.i18next.com/)
- [i18next 文档](https://www.i18next.com/)
- [i18next Browser Language Detector](https://github.com/i18next/i18next-browser-languagedetector)
- [i18next HTTP Backend](https://github.com/i18next/i18next-http-backend)
