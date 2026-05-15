# Query Result Table — Row Selection, Editing & Delete

**Date:** 2026-05-15
**Status:** Approved
**Scope:** EditorPanel.tsx / VirtualTableBody, related i18n, export utilities

---

## 1. User Interaction Model

| Action | Trigger |
|---|---|
| Select single row | Click a row (highlight) |
| Multi-select | Ctrl+Click toggle; Shift+Click range from last selected |
| Deselect all | Click empty area or Escape |
| Edit cell | Double-click a cell |
| Confirm edit | Enter — save to local edit set, highlight cell |
| Cancel edit | Escape — revert to original value |
| Move between cells (edit mode) | Tab / Shift+Tab |
| Right-click context menu | Right-click on selected rows |
| Delete selected | Right-click → Delete (with confirm dialog) |
| Generate DELETE SQL | Right-click → Generate DELETE SQL → insert into editor |
| Batch apply changes | Toolbar "Apply Changes" button appears when edits exist |

All UI text goes through `t()` from `src/lib/i18n.ts` with `zh` and `en` keys.

---

## 2. State

New state in `VirtualTableBody`:

| State | Type | Purpose |
|---|---|---|
| `selectedRows` | `Set<number>` | Row indices currently selected |
| `lastSelectedIdx` | `number \| null` | For Shift+Click range calculation |
| `editingCell` | `{ rowIdx, colName } \| null` | Which cell is in edit mode |
| `editValue` | `string` | Current buffer value while editing |
| `modifiedCells` | `Map<string, any>` | key = `"rowIdx:colName"`, value = new raw value. Only stores changed cells |
| `contextMenu` | `{ x, y } \| null` | Right-click menu position |

Props added to `VirtualTableBody`:

| Prop | Type | Purpose |
|---|---|---|
| `onDeleteRows` | `(rowIndices: number[]) => void` | Execute direct delete |
| `onGenerateDeleteSQL` | `(rowIndices: number[]) => void` | Generate DELETE into editor |
| `onApplyChanges` | `(changes: Map<string, any>) => void` | Apply all accumulated cell edits |
| `columnInfo` | `ColumnInfo[]` | Needed for WHERE clause generation |

`ResultTable` adds:
- `onApplyChanges`, `onDeleteRows`, `onGenerateDeleteSQL` callbacks connected to the parent editor logic
- A toolbar button: "Apply Changes (N)" visible when `modifiedCells.size > 0`

---

## 3. Component Changes

### 3.1 VirtualTableBody (EditorPanel.tsx ~lines 1543-1655)

**Row rendering changes:**
- Add a **row-number column** as the first `<th>` / `<td>` in each row (displays `virtualRow.index + 1`)
- Click on a row → select logic based on Ctrl/Shift state
- Selected rows get highlight styling: `background-color: hsl(var(--accent))` with a left border accent
- Double-click on a regular cell → sets `editingCell`, focuses an `<input>` rendered in that cell
- Right-click on selected rows → sets `contextMenu`

**Inline editing cell rendering:**
When `editingCell.rowIdx === rowIdx && editingCell.colName === colName`:
- Render `<input>` instead of `<span>`
- Auto-focus with `useEffect` + ref
- On Enter: commit value to `modifiedCells`, clear `editingCell`
- On Escape: clear `editingCell`, discard edit
- On Tab: commit, move to next cell (same row next col, or next row first col)
- On Shift+Tab: commit, move to previous cell

**Modified cell visual indicator:**
When a cell key exists in `modifiedCells`:
- Render the modified value (not the original row value)
- Add `bg-orange-500/15 border border-orange-500/50` styling

**Context menu overlay:**
- Conditional render: `{contextMenu && (<ContextMenuOverlay ... />)}`
- Follows the `EditorContextMenu` pattern: fixed backdrop + positioned menu div
- Menu items: Copy Row(s), Export CSV / JSON / SQL, separator, Edit Row, Delete Row(s) (red), Generate DELETE SQL
- When `selectedRows.size === 0`: export/delete items disabled
- Click outside or Escape → `setContextMenu(null)`

### 3.2 ResultTable (EditorPanel.tsx ~lines 1657-1747)

- Pass new props down to `VirtualTableBody`
- Add toolbar area between the table and the status bar:
  - "Apply Changes (N)" button — only when `modifiedCells.size > 0`
  - Uses `hsl(var(--tab-active))` background to make it noticeable
  - Also show "Discard Changes" secondary button

### 3.3 EditorPanel — handleExecute / query lifecycle

- Connect store callbacks: `onApplyChanges` reads `modifiedCells`, converts to `updateTableRows` calls per row, then re-executes the query to refresh data
- `onDeleteRows`: confirmation dialog via `window.confirm` (for now), then `deleteTableRows`, then re-query
- `onGenerateDeleteSQL`: use `buildWhereClause` + column info → `DELETE FROM ... WHERE ...`, insert at editor cursor

---

## 4. Data Flow

### 4.1 Cell Edit → Apply

```
Double-click "Alice" → input shows "Alice"
  → Type "Alice2" → Enter
    → modifiedCells.set("0:name", "Alice2")
    → Cell shows new value with orange highlight
    → Toolbar: "Apply Changes (1)"
  → User clicks "Apply Changes"
    → For each rowIdx in modifiedCells, call updateTableRows(connId, table, updates, whereClause)
    → on success: clear modifiedCells, re-execute query
    → on failure: show error toast, keep modifiedCells
```

### 4.2 Direct Delete

```
Select rows → Right-click → "Delete Row(s)"
  → window.confirm("确认删除 3 行数据？")
  → For each selected row: buildWhereClause(columnInfo, row) → deleteTableRows(connId, table, whereClause)
  → Re-execute query
```

### 4.3 Generate DELETE SQL

```
Select rows → Right-click → "Generate DELETE SQL"
  → For each selected row: buildWhereClause(columnInfo, row) → DELETE FROM ... WHERE ...
  → Concatenate all DELETE statements
  → Insert at editor cursor position
  → If no editor focused (e.g. viewing saved results), open a new query tab
```

### 4.4 Export Selected

```
Select rows → Right-click → "Export Selected as CSV"
  → exportToCSV(columns, selectedRowData) → downloadFile(content, "export.csv", "text/csv")
```

---

## 5. Keyboard Shortcuts

| Key | Context | Action |
|---|---|---|
| ↑/↓ | Table focused | Move selection up/down one row |
| Shift+↑/↓ | Table focused | Extend selection range |
| Ctrl+A | Table focused | Select all loaded rows |
| Delete | Rows selected | Delete selected rows (confirm dialog) |
| Enter | Row selected, not editing | N/A (reserved) |
| Enter | Cell editing | Confirm edit |
| Escape | Cell editing | Cancel edit |
| Escape | Context menu open | Close menu |
| Escape | Rows selected | Clear selection |
| Tab | Cell editing | Commit + move to next cell |
| Shift+Tab | Cell editing | Commit + move to previous cell |

---

## 6. i18n Keys

New keys in `src/lib/i18n.ts` under a `"table"` namespace:

| Key | en | zh |
|---|---|---|
| `table.copyRows` | Copy Row(s) | 复制行 |
| `table.exportCSV` | Export Selected as CSV | 导出选中为CSV |
| `table.exportJSON` | Export Selected as JSON | 导出选中为JSON |
| `table.exportSQL` | Export Selected as SQL | 导出选中为SQL |
| `table.editRow` | Edit Row | 编辑行 |
| `table.deleteRows` | Delete Row(s) | 删除选中行 |
| `table.deleteConfirm` | Delete {count} row(s)? | 确认删除 {count} 行？ |
| `table.generateDeleteSQL` | Generate DELETE SQL | 生成DELETE语句 |
| `table.applyChanges` | Apply Changes | 应用修改 |
| `table.applyChangesTip` | {count} row(s) modified | {count} 行已修改 |
| `table.changesApplied` | Changes applied | 修改已应用 |
| `table.deleteSuccess` | {count} row(s) deleted | 已删除 {count} 行 |
| `table.changesPending` | {count} cell(s) modified | {count} 个单元格已修改 |
| `table.discardChanges` | Discard Changes | 放弃修改 |
| `table.editing` | Editing | 编辑中 |

---

## 7. Files Touched

| File | Change |
|---|---|
| `src/components/EditorPanel.tsx` | Main changes: VirtualTableBody (selection, editing, context menu), ResultTable (toolbar, callbacks), EditorPanel (callback wiring) |
| `src/lib/i18n.ts` | Add ~15 i18n keys |
| `src/lib/export.ts` | No changes (existing functions work for selected rows) |
| `src/lib/tauri-commands.ts` | No changes (existing commands sufficient) |
| `src/styles/index.css` | Minor: accent highlight style, editing cell style (if tailwind not sufficient) |

---

## 8. Constraints

- **Table name required**: Edit and delete operations require a known target table. Available when:
  - The tab's `tableName` property is set (browsing from sidebar)
  - The result has at least one `isPrimaryKey` column (for WHERE clause generation)
- For arbitrary SELECT queries without table context, editing and delete menu items are disabled. Export still works.
- The result must be from a direct table query or a simple SELECT from a single table.

## 9. Out of Scope

- Cell editing in the import preview table (import preview is read-only)
- Undo/redo of cell edits
- Foreign-key-aware dropdowns for editing
- Edit/delete on non-SELECT result sets (INSERT/UPDATE/DELETE already handled by ExecuteResult)
