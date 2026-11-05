# week-time-picker

星期 × 24 小时点选时间选择器 —— 纯 CSS + jQuery 插件，零依赖（仅依赖 jQuery），一行代码接入任何页面。

## 特性

- 7 天（周一 ~ 周日）× 24 小时（半小时粒度，共 48 格/天）点选面板
- 支持同一天多个不连续时段
- 支持按住鼠标拖动连选 / 连取消
- 双格式设计：**机内值**（存库、提交）+ **展示值**（输入框显示），互不干扰
- 输入框鼠标悬停时弹出深色提示层，按"一天一行"换行展示完整配置
- 支持动态渲染的行：新增行后再次调用绑定即可，内部防重复绑定
- 面板自适应屏幕右边界，不会被窗口裁切

## 效果预览

直接用浏览器打开 `index.html` 即可体验（需联网加载 jQuery CDN）。

## 文件说明

| 文件 | 说明 |
| ---- | ---- |
| `week-time-picker.js` | 插件脚本 |
| `week-time-picker.css` | 插件样式 |
| `index.html` | 在线演示页（含基本用法、回显、动态行三个示例） |
| `README.md` | 本文档 |

## 快速开始

### 1. 引入文件

```html
<link rel="stylesheet" href="week-time-picker.css">
<script src="https://cdn.jsdelivr.net/npm/jquery@1.12.4/dist/jquery.min.js"></script>
<script src="week-time-picker.js"></script>
```

jQuery 1.x / 2.x / 3.x 均可。

### 2. 页面结构（双 input 模式，推荐）

```html
<!-- 隐藏 input：带 name，保存机内值，随表单提交 -->
<input type="hidden" name="deployTime" value="1=07:00-09:00,18:00-23:00;2=07:00-23:00">
<!-- 可见 input：readonly、不带 name，只负责展示与唤起面板 -->
<input type="text" class="week-time-input" readonly placeholder="请点选投放时间">
```

> 注意：两个 input 必须紧邻，隐藏域在前。若无隐藏域，插件会把机内值存在可见 input 的 `data('week-time-value')` 上（见"无表单提交场景"）。

### 3. 初始回显与绑定

```javascript
$(function () {
    // 历史数据回显：机内值 -> 展示值
    $('.week-time-input').val(window.weekTimeToDisplay($('[name="deployTime"]').val()));

    // 绑定（内部防重复绑定）
    bindWeekTimePickerInputs(document);
});
```

### 4. 动态添加的行

```javascript
var $row = $('<div>' +
    '<input type="hidden" name="rowTime_2" value="">' +
    '<input type="text" class="week-time-input" readonly>' +
    '</div>');
$('#container').append($row);

// 只对新容器再调一次绑定即可，已有行不受影响
bindWeekTimePickerInputs($row);
```

## API

### `bindWeekTimePickerInputs(context)`

- 扫描 `context`（DOM 节点、jQuery 对象或选择器，缺省为 `document`）内所有 `.week-time-input` 并完成绑定
- 内部防重复绑定，可放心对同一容器反复调用

### `$.fn.weekTimePicker()`

对 jQuery 对象手动初始化，一般无需直接调用，`bindWeekTimePickerInputs` 内部即调用它。

### `window.weekTimeToDisplay(machineValue)`

机内值 → 展示值 的纯函数转换，用于渲染行时回显。无法解析的值（如历史遗留的 `HH:mm:ss` 格式）返回空字符串。

## 数据格式

### 机内格式（存库 / 提交值）

```
day=HH:mm-HH:mm,HH:mm-HH:mm;day=HH:mm-HH:mm
```

示例：

```
1=07:00-09:00,18:00-23:00;2=07:00-23:00
```

- `day`：`1`=星期一 … `7`=星期日
- 时段粒度为 **30 分钟**
- 同一天多个不连续时段用 `,` 分隔；天与天之间用 `;` 分隔
- 结束时间为所选最后一格的结束时刻，选满一天时为 `24:00`
- 全天未选则该天不出现；整体为空串表示未配置

### 展示格式（输入框显示值）

```
星期一:07:00~09:00,18:00~23:00;星期二:07:00~23:00
```

鼠标悬停输入框时，提示层会按分号拆成一天一行展示：

```
星期一:07:00~09:00,18:00~23:00
星期二:07:00~23:00
```

## 交互说明

| 操作 | 行为 |
| ---- | ---- |
| 点击输入框 | 弹出点选面板，并从当前已存值恢复选中状态 |
| 单击格子 | 选中 / 取消选中该半小时 |
| 按住拖动 | 从起始格开始连选或连取消（以按下那格的"取反"状态为准） |
| 清空 | 清空面板内所有选中（未点"确定"前不影响已存值） |
| 确定 | 把面板选择写入隐藏域（机内值）与输入框（展示值），关闭面板 |
| 关闭 / 点击面板外 | 丢弃面板内未确定的修改并关闭 |
| 鼠标悬停输入框 | 弹出深色提示层，一天一行展示当前配置；移开后消失 |

## 无表单提交场景

如果不想放隐藏域（纯前端取值），可以只用一个可见 input：

```html
<input type="text" class="week-time-input" readonly placeholder="请点选投放时间">
```

确定后机内值存在该 input 的 jQuery data 上：

```javascript
var machineValue = $input.data('week-time-value') || '';
```

## 后端解析参考

机内格式解析非常简单，以 Java 为例：

```java
// "1=07:00-09:00;2=07:00-23:00" -> Map<Integer, List<int[]>>
Map<Integer, List<int[]>> dayRanges = new HashMap<>();
for (String dayPart : machineValue.split(";")) {
    if (dayPart.isEmpty()) continue;
    int eq = dayPart.indexOf('=');
    int day = Integer.parseInt(dayPart.substring(0, eq));
    List<int[]> ranges = new ArrayList<>();
    for (String range : dayPart.substring(eq + 1).split(",")) {
        String[] arr = range.split("-");
        ranges.add(new int[]{toMinutes(arr[0]), toMinutes(arr[1])});
    }
    dayRanges.put(day, ranges);
}
```

## 浏览器兼容

Chrome / Edge / Firefox / Safari 等现代浏览器，以及基于 Bootstrap 的后台管理系统（若依 RuoYi 等）均可直接使用。若接入页面已有 Bootstrap，不影响样式——本插件不依赖任何 UI 框架。

## License

MIT
