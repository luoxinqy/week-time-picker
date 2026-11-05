/**
 * 星期 × 24 小时点选时间选择器（jQuery 插件）
 *
 * 机内格式（存库/提交值）：day=HH:mm-HH:mm,HH:mm-HH:mm;...
 *   如 "1=07:00-09:00,18:00-23:00;2=07:00-23:00"
 *   day：1=星期一 ... 7=星期日；半小时粒度；同一天多个不连续时段用逗号分隔；结束时间为该时段最后一格的结束时刻（含 24:00）
 * 展示格式（input 显示值）：星期一:07:00~09:00,18:00~23:00;星期二:07:00~23:00
 *
 * 用法：可见 input 加 class="week-time-input"（readonly、不带 name），其紧邻的前一个
 * input[type=hidden]（带 name）保存机内值随表单提交；点击可见 input 弹出面板。
 * 页面渲染后调用 bindWeekTimePickerInputs(context) 完成绑定（内部防重复绑定）。
 */
(function ($) {
    var DAY_NAMES = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
    var SLOT_COUNT = 48;

    function emptyState() {
        var state = [];
        for (var d = 0; d < 7; d++) {
            var row = [];
            for (var s = 0; s < SLOT_COUNT; s++) {
                row.push(false);
            }
            state.push(row);
        }
        return state;
    }

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function minutesToTime(v) {
        return pad(Math.floor(v / 60)) + ':' + pad(v % 60);
    }

    function timeToMinutes(text) {
        var match = /^(\d{2}):(\d{2})$/.exec(text);
        if (!match) {
            return null;
        }
        var h = parseInt(match[1], 10);
        var m = parseInt(match[2], 10);
        if (m !== 0 && m !== 30) {
            return null;
        }
        if (h > 24 || (h === 24 && m !== 0)) {
            return null;
        }
        return h * 60 + m;
    }

    function parseValue(value) {
        var state = emptyState();
        var str = (value === null || value === undefined) ? '' : String(value).trim();
        if (!str) {
            return state;
        }
        str.split(';').forEach(function (dayPart) {
            if (!dayPart) {
                return;
            }
            var eq = dayPart.indexOf('=');
            if (eq < 0) {
                return;
            }
            var day = parseInt(dayPart.substring(0, eq), 10);
            if (isNaN(day) || day < 1 || day > 7) {
                return;
            }
            dayPart.substring(eq + 1).split(',').forEach(function (range) {
                var dash = range.indexOf('-');
                if (dash < 0) {
                    return;
                }
                var start = timeToMinutes(range.substring(0, dash));
                var end = timeToMinutes(range.substring(dash + 1));
                if (start === null || end === null || start >= end) {
                    return;
                }
                for (var s = start / 30; s < end / 30; s++) {
                    state[day - 1][s] = true;
                }
            });
        });
        return state;
    }

    function stateToRanges(state) {
        var result = [];
        for (var d = 0; d < 7; d++) {
            var ranges = [];
            var runStart = -1;
            for (var s = 0; s < SLOT_COUNT; s++) {
                if (state[d][s] && runStart < 0) {
                    runStart = s;
                }
                if (!state[d][s] && runStart >= 0) {
                    ranges.push([runStart * 30, s * 30]);
                    runStart = -1;
                }
            }
            if (runStart >= 0) {
                ranges.push([runStart * 30, SLOT_COUNT * 30]);
            }
            result.push(ranges);
        }
        return result;
    }

    function formatValue(state) {
        var parts = [];
        stateToRanges(state).forEach(function (ranges, d) {
            if (!ranges.length) {
                return;
            }
            var rangeTexts = ranges.map(function (r) {
                return minutesToTime(r[0]) + '-' + minutesToTime(r[1]);
            });
            parts.push((d + 1) + '=' + rangeTexts.join(','));
        });
        return parts.join(';');
    }

    function formatDisplay(state) {
        var parts = [];
        stateToRanges(state).forEach(function (ranges, d) {
            if (!ranges.length) {
                return;
            }
            var rangeTexts = ranges.map(function (r) {
                return minutesToTime(r[0]) + '~' + minutesToTime(r[1]);
            });
            parts.push(DAY_NAMES[d] + ':' + rangeTexts.join(','));
        });
        return parts.join(';');
    }

    // 机内格式 -> 展示格式（供页面渲染行时转换回显值；无法解析返回空串，兼容历史 HH:mm:ss 旧值）
    window.weekTimeToDisplay = function (value) {
        return formatDisplay(parseValue(value));
    };

    $.fn.weekTimePicker = function () {
        return this.each(function () {
            var $input = $(this);
            if ($input.data('week-time-picker')) {
                return;
            }
            $input.data('week-time-picker', true);

            var $hidden = $input.prev('input[type="hidden"]');
            var state = emptyState();
            var $panel = null;
            var painting = false;
            var paintValue = true;

            function readStoredValue() {
                if ($hidden.length) {
                    return $hidden.val();
                }
                return $input.data('week-time-value') || '';
            }

            function writeValue() {
                $input.val(formatDisplay(state));
                if ($hidden.length) {
                    $hidden.val(formatValue(state));
                } else {
                    $input.data('week-time-value', formatValue(state));
                }
                refreshTip();
            }

            // hover 提示层：展示串按分号换行（一天一行）
            var $tip = null;

            function refreshTip() {
                var text = $input.val();
                if (!text) {
                    $input.attr('data-wtp-tip', '');
                    return;
                }
                $input.attr('data-wtp-tip', text.split(';').join('\n'));
            }

            function showTip() {
                var text = $input.attr('data-wtp-tip');
                if (!text) {
                    return;
                }
                if (!$tip) {
                    $tip = $('<pre class="wtp-hover-tip"></pre>').appendTo('body');
                }
                $tip.text(text);
                var offset = $input.offset();
                $tip.css({
                    top: offset.top - $tip.outerHeight() - 6,
                    left: offset.left
                }).show();
            }

            function hideTip() {
                if ($tip) {
                    $tip.hide();
                }
            }

            function setSlot(day, slot, value) {
                state[day][slot] = value;
                $panel.find('.wtp-slot[data-day="' + day + '"][data-slot="' + slot + '"]').toggleClass('selected', value);
            }

            function renderCells() {
                $panel.find('.wtp-slot').each(function () {
                    var $cell = $(this);
                    $cell.toggleClass('selected', state[$cell.data('day')][$cell.data('slot')]);
                });
            }

            function buildPanel() {
                var html = '';
                html += '<div class="week-time-picker-panel">';
                html += '<div class="wtp-title">投放结束时间（星期 × 24 小时）</div>';
                html += '<table class="wtp-table"><thead>';
                html += '<tr class="wtp-group-row"><th class="wtp-corner"></th><th colspan="24">00:00 - 12:00</th><th colspan="24">12:00 - 24:00</th></tr>';
                html += '<tr class="wtp-hour-row"><th class="wtp-corner"></th>';
                for (var s = 0; s < SLOT_COUNT; s++) {
                    html += '<th>' + (s % 2 === 0 ? pad(s / 2) : '30') + '</th>';
                }
                html += '</tr></thead><tbody>';
                for (var d = 0; d < 7; d++) {
                    html += '<tr><td class="wtp-day-cell">' + DAY_NAMES[d] + '</td>';
                    for (var s2 = 0; s2 < SLOT_COUNT; s2++) {
                        html += '<td class="wtp-slot" data-day="' + d + '" data-slot="' + s2 + '"></td>';
                    }
                    html += '</tr>';
                }
                html += '</tbody></table>';
                html += '<div class="wtp-footer">';
                html += '<span class="wtp-tip">请用鼠标点选时间段（可按住拖动连选）</span>';
                html += '<a href="javascript:void(0)" class="wtp-clear">清空</a>';
                html += '<button type="button" class="wtp-btn wtp-btn-primary wtp-ok">确定</button>';
                html += '<button type="button" class="wtp-btn wtp-btn-default wtp-cancel">关闭</button>';
                html += '</div></div>';
                $panel = $(html);

                $panel.on('mousedown', '.wtp-slot', function (e) {
                    e.preventDefault();
                    var $cell = $(this);
                    var day = $cell.data('day');
                    var slot = $cell.data('slot');
                    painting = true;
                    paintValue = !state[day][slot];
                    setSlot(day, slot, paintValue);
                });
                $panel.on('mouseover', '.wtp-slot', function () {
                    if (!painting) {
                        return;
                    }
                    var $cell = $(this);
                    setSlot($cell.data('day'), $cell.data('slot'), paintValue);
                });
                $panel.on('click', '.wtp-clear', function () {
                    state = emptyState();
                    renderCells();
                });
                $panel.on('click', '.wtp-ok', function () {
                    writeValue();
                    close();
                });
                $panel.on('click', '.wtp-cancel', function () {
                    close();
                });
            }

            function positionPanel() {
                var offset = $input.offset();
                var left = offset.left;
                var scrollLeft = $(window).scrollLeft();
                var maxLeft = scrollLeft + $(window).width() - $panel.outerWidth() - 8;
                if (left > maxLeft) {
                    left = Math.max(scrollLeft + 8, maxLeft);
                }
                $panel.css({
                    top: offset.top + $input.outerHeight() + 4,
                    left: left
                });
            }

            function open() {
                if (!$panel) {
                    buildPanel();
                    $('body').append($panel);
                }
                // 每次打开都从已存值重新解析，关闭（未确定）即丢弃面板内未保存的点选
                state = parseValue(readStoredValue());
                renderCells();
                positionPanel();
                $panel.show();
            }

            function close() {
                if ($panel) {
                    $panel.hide();
                }
                painting = false;
            }

            function autoHeight() {
                refreshTip();
            }

            $input.on('mouseenter', function () {
                refreshTip();
                showTip();
            });
            $input.on('mouseleave', hideTip);

            $input.on('click focus', function (e) {
                e.preventDefault();
                hideTip();
                open();
            });

            $(document).on('mouseup', function () {
                painting = false;
            });
            $(document).on('mousedown', function (e) {
                if (!$panel || !$panel.is(':visible')) {
                    return;
                }
                if ($.contains($panel[0], e.target) || e.target === $input[0]) {
                    return;
                }
                close();
            });
        });
    };

    window.bindWeekTimePickerInputs = function (context) {
        var $scope = context ? $(context) : $(document);
        $scope.find('.week-time-input').each(function () {
            $(this).weekTimePicker();
        });
    };
})(jQuery);
