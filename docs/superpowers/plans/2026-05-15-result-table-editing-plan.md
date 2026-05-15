# Result Table — Row Selection, Editing & Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add row selection, inline cell editing, batch apply changes, right-click context menu with export/delete, and delete operations to the query result table (VirtualTableBody) in EditorPanel.tsx.

**Architecture:** All new state lives inside `VirtualTableBody` (selection, editing, context menu). Callbacks (`onApplyChanges`, `onDeleteRows`, `onGenerateDeleteSQL`) are passed down from `ResultTable` → `EditorPanel` which wires them to existing Tauri commands (`updateTableRows`, `deleteTableRows`) and the Monaco editor. A row-number column is added as the first column for selection affordance. Modified cells are tracked in a `Map<string, any>` keyed by `"rowIdx:colName"`.

**Tech Stack:** React, TypeScript, @tanstack/react-virtual, Tailwind CSS, Tauri (existing commands), Zustand (existing store)

---

### Task 1: Add i18n keys

**Files:**
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: Add table operation i18n keys**

Read `src/lib/i18n.ts` to find the current key layout. Add the following block before the `// ===== Error codes =====` section (or at a logical location near other UI keys). Add to BOTH the `zh` and `en` language entries.

For the `en` block, add:
```typescript
    // ===== Table row operations =====
    'table.copyRows': 'Copy Row(s)',
    'table.exportCSV': 'Export Selected as CSV',
    'table.exportJSON': 'Export Selected as JSON',
    'table.exportSQL': 'Export Selected as SQL',
    'table.editRow': 'Edit Row',
    'table.deleteRows': 'Delete Row(s)',
    'table.deleteConfirm': 'Are you sure you want to delete {count} row(s)?',
    'table.generateDeleteSQL': 'Generate DELETE SQL',
    'table.applyChanges': 'Apply Changes',
    'table.applyChangesTip': '{count} row(s) modified',
    'table.changesApplied': 'Changes applied successfully',
    'table.deleteSuccess': '{count} row(s) deleted successfully',
    'table.changesPending': '{count} cell(s) modified — click Apply Changes to save',
    'table.discardChanges': 'Discard Changes',
    'table.editing': 'Editing',
```

For the `zh` block, add:
```typescript
    // ===== Table row operations =====
    'table.copyRows': '复制行',
    'table.exportCSV': '导出选中为CSV',
    'table.exportJSON': '导出选中为JSON',
    'table.exportSQL': '导出选中为SQL',
    'table.editRow': '编辑行',
    'table.deleteRows': '删除选中行',
    'table.deleteConfirm': '确认删除 {count} 行数据？',
    'table.generateDeleteSQL': '生成DELETE语句',
    'table.applyChanges': '应用修改',
    'table.applyChangesTip': '{count} 行已修改',
    'table.changesApplied': '修改已应用',
    'table.deleteSuccess': '已删除 {count} 行',
    'table.changesPending': '{count} 个单元格已修改 — 点击"应用修改"保存',
    'table.discardChanges': '放弃修改',
    'table.editing': '编辑中',
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "i18n" || echo "No i18n errors"`
Expected: No i18n errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat: add table row operation i18n keys for edit, delete, export

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Add row selection state and click handling to VirtualTableBody

**Files:**
- Modify: `src/components/EditorPanel.tsx` (VirtualTableBody function, ~lines 1543-1655)

- [ ] **Step 1: Add selection state and a row-number column header**

Replace the VirtualTableBody function signature and state initialization. The existing function starts at ~line 1543. Add new state after the `useEffect` for load-more (after line 1571):

```typescript
function VirtualTableBody({
  rows, columns, virtualCount, hasMore, isLoadingMore, onLoadMore,
  onSelectionChange,
}: {
  rows: any[];
  columns: any[];
  virtualCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onSelectionChange?: (indices: number[]) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [lastClickedIdx, setLastClickedIdx] = useState<number | null>(null);

  const virtualizer = useVirtualizer({
    count: virtualCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 28,
    overscan: 15,
  });

  // Trigger load-more when last items come into view
  useEffect(() => {
    const items = virtualizer.getVirtualItems();
    const lastItem = items[items.length - 1];
    if (!lastItem) return;
    const lastIdx = lastItem.index;
    if (lastIdx >= rows.length - 5 && hasMore && !isLoadingMore) {
      onLoadMore();
    }
  }, [virtualizer.getVirtualItems(), rows.length, hasMore, isLoadingMore, onLoadMore]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(Array.from(selectedRows));
  }, [selectedRows, onSelectionChange]);

  const toggleRow = useCallback((idx: number, ctrl: boolean, shift: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (shift && lastClickedIdx !== null && lastClickedIdx !== idx) {
        // Shift+Click: select range
        const from = Math.min(lastClickedIdx, idx);
        const to = Math.max(lastClickedIdx, idx);
        for (let i = from; i <= to; i++) next.add(i);
      } else if (ctrl) {
        // Ctrl+Click: toggle single row
        if (next.has(idx)) { next.delete(idx); } else { next.add(idx); }
      } else {
        // Plain click: single selection
        next.clear();
        next.add(idx);
      }
      return next;
    });
    setLastClickedIdx(idx);
  }, [lastClickedIdx]);
```

- [ ] **Step 2: Add row-number column to thead**

In the existing `<thead>` section (~line 1586), add a row-number `<th>` before the column loop:

```typescript
<thead className="sticky top-0 z-10">
  <tr>
    {/* Row-number column header */}
    <th
      className="px-1.5 py-1.5 text-center font-medium text-white/50 border border-white/30"
      style={{ backgroundColor: 'hsl(var(--tab-active))', width: 36, minWidth: 36 }}
    >
      #
    </th>
    {columns.map((col: any) => (
      // ... existing th code unchanged ...
```

- [ ] **Step 3: Add row-number cell and click handler to each data row**

In the `<tbody>` data row rendering (~line 1625-1643), wrap the existing `<tr>` with click handling and add a row-number `<td>`:

Replace the data row `<tr>` block:
```typescript
const row = rows[virtualRow.index];
const rowIdx = virtualRow.index;
const isSelected = selectedRows.has(rowIdx);
return (
  <tr
    key={virtualRow.key}
    className={`hover:bg-accent transition-colors even:bg-muted/60 ${isSelected ? 'ring-1 ring-inset ring-blue-400' : ''}`}
    style={{ height: 28, backgroundColor: isSelected ? 'hsl(var(--accent))' : undefined }}
    onClick={(e) => {
      e.preventDefault();
      toggleRow(rowIdx, e.ctrlKey || e.metaKey, e.shiftKey);
    }}
    onContextMenu={(e) => {
      e.preventDefault();
      // Context menu will be added in Task 5
    }}
  >
    {/* Row-number cell */}
    <td
      className="px-1.5 py-1 text-center border text-muted-foreground select-none"
      style={{ width: 36, minWidth: 36, fontSize: 10, cursor: 'pointer' }}
    >
      {rowIdx + 1}
    </td>
    {columns.map((col: any) => (
      <td
        key={col.name}
        className="px-3 py-1 whitespace-nowrap truncate border"
        style={{ minWidth: COL_MIN_WIDTH }}
      >
        <span className={row[col.name] === null ? "text-muted-foreground/40 italic" : "text-foreground"}>
          {row[col.name] === null ? "NULL" : String(row[col.name])}
        </span>
      </td>
    ))}
  </tr>
);
```

Also update the spacer rows to account for the extra column (change `colSpan={columns.length}` to `colSpan={columns.length + 1}`):

For the top spacer:
```typescript
{beforeHeight > 0 && (
  <tr style={{ height: beforeHeight }}>
    <td colSpan={columns.length + 1} style={{ padding: 0, border: 'none' }} />
  </tr>
)}
```

For the sentinel row:
```typescript
<tr key="sentinel" style={{ height: 28 }}>
  <td colSpan={columns.length + 1} className="border">
    <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
      {isLoadingMore && <Loader2 size={12} className="animate-spin" />}
      {isLoadingMore ? 'Loading...' : 'Scroll for more...'}
    </div>
  </td>
</tr>
```

For the bottom spacer:
```typescript
{afterHeight > 0 && (
  <tr style={{ height: afterHeight }}>
    <td colSpan={columns.length + 1} style={{ padding: 0, border: 'none' }} />
  </tr>
)}
```

- [ ] **Step 4: Update the table's minWidth to account for row-number column**

Change the `<table>` style `minWidth` from `columns.length * COL_MIN_WIDTH` to `36 + columns.length * COL_MIN_WIDTH`:

```typescript
style={{ tableLayout: 'fixed', width: '100%', minWidth: 36 + columns.length * COL_MIN_WIDTH }}
```

- [ ] **Step 5: Verify build**

Run: `cd d:/code/openCode/CrabHub && npx vite build 2>&1 | tail -5`
Expected: `✓ built in ...s`

- [ ] **Step 6: Commit**

```bash
git add src/components/EditorPanel.tsx
git commit -m "feat: add row selection with click/Ctrl/Shift and row-number column

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Add inline cell editing (double-click → input)

**Files:**
- Modify: `src/components/EditorPanel.tsx` (VirtualTableBody)

- [ ] **Step 1: Add editing state to VirtualTableBody**

Add these state declarations after the selection state (after `toggleRow`):

```typescript
const [editingCell, setEditingCell] = useState<{ rowIdx: number; colName: string } | null>(null);
const [editValue, setEditValue] = useState('');
const [modifiedCells, setModifiedCells] = useState<Map<string, any>>(new Map());
const editInputRef = useRef<HTMLInputElement>(null);

// Focus input when editing starts
useEffect(() => {
  if (editingCell && editInputRef.current) {
    editInputRef.current.focus();
    editInputRef.current.select();
  }
}, [editingCell]);
```

- [ ] **Step 2: Wire double-click on cells and keyboard handling**

Update the data row rendering. In the columns map inside each `<tr>`, change the `<td>` to support double-click editing.

Replace the existing `<td>` block inside the columns map:

```typescript
{columns.map((col: any) => {
  const cellKey = `${rowIdx}:${col.name}`;
  const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.colName === col.name;
  const modifiedValue = modifiedCells.get(cellKey);
  const displayValue = modifiedValue !== undefined ? modifiedValue : row[col.name];
  const isModified = modifiedCells.has(cellKey);

  if (isEditing) {
    return (
      <td
        key={col.name}
        className="px-0 py-0 border"
        style={{ minWidth: COL_MIN_WIDTH }}
      >
        <input
          ref={editInputRef}
          className="w-full h-full px-3 py-1 text-xs bg-[hsl(var(--background))] text-foreground outline-none ring-2 ring-inset ring-orange-400"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              // Commit: store new value in modifiedCells
              const originalVal = row[col.name];
              if (editValue !== String(originalVal ?? '')) {
                setModifiedCells((prev) => {
                  const next = new Map(prev);
                  next.set(cellKey, editValue === 'NULL' ? null : editValue);
                  return next;
                });
              }
              setEditingCell(null);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setEditingCell(null);
            } else if (e.key === 'Tab') {
              e.preventDefault();
              // Commit current cell then move
              const originalVal = row[col.name];
              if (editValue !== String(originalVal ?? '')) {
                setModifiedCells((prev) => {
                  const next = new Map(prev);
                  next.set(cellKey, editValue === 'NULL' ? null : editValue);
                  return next;
                });
              }
              setEditingCell(null);
              // Move to next/prev cell
              const colIdx = columns.findIndex((c: any) => c.name === col.name);
              if (e.shiftKey) {
                // Move to previous cell
                if (colIdx > 0) {
                  const prevCol = columns[colIdx - 1];
                  setTimeout(() => {
                    setEditingCell({ rowIdx, colName: prevCol.name });
                    setEditValue(String(modifiedCells.get(`${rowIdx}:${prevCol.name}`) ?? row[prevCol.name] ?? ''));
                  }, 0);
                }
              } else {
                // Move to next cell
                if (colIdx < columns.length - 1) {
                  const nextCol = columns[colIdx + 1];
                  setTimeout(() => {
                    setEditingCell({ rowIdx, colName: nextCol.name });
                    setEditValue(String(modifiedCells.get(`${rowIdx}:${nextCol.name}`) ?? row[nextCol.name] ?? ''));
                  }, 0);
                }
              }
            }
          }}
          onBlur={() => {
            // Commit on blur
            const originalVal = row[col.name];
            if (editValue !== String(originalVal ?? '')) {
              setModifiedCells((prev) => {
                const next = new Map(prev);
                next.set(cellKey, editValue === 'NULL' ? null : editValue);
                return next;
              });
            }
            setEditingCell(null);
          }}
        />
      </td>
    );
  }

  return (
    <td
      key={col.name}
      className={`px-3 py-1 whitespace-nowrap truncate border ${isModified ? 'bg-orange-500/15 ring-1 ring-inset ring-orange-500/50' : ''}`}
      style={{ minWidth: COL_MIN_WIDTH, cursor: 'default' }}
      onDoubleClick={(e) => {
        e.preventDefault();
        const currentVal = modifiedCells.get(cellKey);
        const val = currentVal !== undefined ? currentVal : row[col.name];
        setEditValue(val === null ? '' : String(val));
        setEditingCell({ rowIdx, colName: col.name });
      }}
    >
      <span className={displayValue === null ? "text-muted-foreground/40 italic" : "text-foreground"}>
        {displayValue === null ? "NULL" : String(displayValue)}
      </span>
    </td>
  );
})}
```

- [ ] **Step 2: Verify build**

Run: `cd d:/code/openCode/CrabHub && npx vite build 2>&1 | tail -5`
Expected: `✓ built in ...s`

- [ ] **Step 3: Commit**

```bash
git add src/components/EditorPanel.tsx
git commit -m "feat: add inline cell editing with double-click, Enter/Escape/Tab navigation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Add right-click context menu overlay

**Files:**
- Modify: `src/components/EditorPanel.tsx` (VirtualTableBody and new TableContextMenu component)

- [ ] **Step 1: Add context menu state and the TableContextMenu component**

Add context menu state in VirtualTableBody (after the editing state):

```typescript
const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
```

Add a new `TableContextMenu` component before the `VirtualTableBody` function (after the `COL_MIN_WIDTH` constant, ~line 1540):

```typescript
interface TableContextMenuProps {
  x: number;
  y: number;
  selectedCount: number;
  hasSelection: boolean;
  canEdit: boolean;
  onClose: () => void;
  onCopyRows: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onExportSQL: () => void;
  onEditRow: () => void;
  onDeleteRows: () => void;
  onGenerateDeleteSQL: () => void;
}

function TableContextMenu({
  x, y, selectedCount, hasSelection, canEdit, onClose,
  onCopyRows, onExportCSV, onExportJSON, onExportSQL,
  onEditRow, onDeleteRows, onGenerateDeleteSQL,
}: TableContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let ax = x, ay = y;
      if (x + rect.width > window.innerWidth) ax = window.innerWidth - rect.width - 4;
      if (y + rect.height > window.innerHeight) ay = window.innerHeight - rect.height - 4;
      setPos({ x: ax, y: ay });
    }
  }, [x, y]);

  const item = (label: string, onClick: () => void, icon: React.ReactNode, disabled?: boolean, destructive?: boolean) => (
    <button
      onClick={() => { if (!disabled) { onClick(); onClose(); } }}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors disabled:opacity-40 disabled:cursor-default ${
        destructive ? 'text-red-400 hover:bg-red-500/10' : 'hover:bg-muted'
      }`}
    >
      <span className="w-4 flex items-center justify-center">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {selectedCount > 0 && (
        <span className="text-[10px] text-muted-foreground ml-2">{selectedCount}</span>
      )}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={menuRef}
        className="fixed z-50 border border-border rounded-md shadow-lg py-1 min-w-[200px]"
        style={{ left: pos.x, top: pos.y, backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }}
      >
        {item(t('table.copyRows'), onCopyRows, <Copy size={12} />, !hasSelection)}
        <div className="border-t border-border my-1" />
        {item(t('table.exportCSV'), onExportCSV, <Database size={12} />, !hasSelection)}
        {item(t('table.exportJSON'), onExportJSON, <Code2 size={12} />, !hasSelection)}
        {item(t('table.exportSQL'), onExportSQL, <Database size={12} />, !hasSelection)}
        <div className="border-t border-border my-1" />
        {item(t('table.editRow'), onEditRow, <TextCursorInput size={12} />, !canEdit || selectedCount !== 1)}
        {item(t('table.generateDeleteSQL'), onGenerateDeleteSQL, <Code2 size={12} />, !canEdit || !hasSelection)}
        {item(t('table.deleteRows'), onDeleteRows, <XCircle size={12} />, !canEdit || !hasSelection, true)}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire context menu trigger to row right-click**

In VirtualTableBody, update the `onContextMenu` handler on the data row `<tr>`:

```typescript
onContextMenu={(e) => {
  e.preventDefault();
  // If right-clicking a non-selected row, select it first
  if (!selectedRows.has(rowIdx)) {
    setSelectedRows(new Set([rowIdx]));
    setLastClickedIdx(rowIdx);
  }
  setContextMenu({ x: e.clientX, y: e.clientY });
}}
```

- [ ] **Step 3: Render TableContextMenu and wire callbacks**

After the closing `</table>` (before `</div>` at the end of VirtualTableBody's return), add:

```typescript
{contextMenu && (
  <TableContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    selectedCount={selectedRows.size}
    hasSelection={selectedRows.size > 0}
    canEdit={onSelectionChange != null}
    onClose={() => setContextMenu(null)}
    onCopyRows={() => {
      const selectedData = Array.from(selectedRows)
        .filter(i => i < rows.length)
        .map(i => rows[i]);
      const text = selectedData.map(row =>
        columns.map((c: any) => String(row[c.name] ?? '')).join('\t')
      ).join('\n');
      navigator.clipboard.writeText(text);
    }}
    onExportCSV={() => {
      const selectedData = Array.from(selectedRows)
        .filter(i => i < rows.length)
        .map(i => rows[i]);
      const csv = exportToCSV(columns, selectedData);
      downloadFile(csv, 'selected_export.csv', 'text/csv');
    }}
    onExportJSON={() => {
      const selectedData = Array.from(selectedRows)
        .filter(i => i < rows.length)
        .map(i => rows[i]);
      const json = exportToJSON(columns, selectedData);
      downloadFile(json, 'selected_export.json', 'application/json');
    }}
    onExportSQL={() => {
      const selectedData = Array.from(selectedRows)
        .filter(i => i < rows.length)
        .map(i => rows[i]);
      const sql = exportToSQL(columns, selectedData, 'selected_data');
      downloadFile(sql, 'selected_export.sql', 'text/plain');
    }}
    onEditRow={() => {
      // Start editing first cell of first selected row
      const idx = Array.from(selectedRows)[0];
      if (idx < rows.length && columns.length > 0) {
        const col = columns[0];
        const val = rows[idx][col.name];
        setEditValue(val === null ? '' : String(val));
        setEditingCell({ rowIdx: idx, colName: col.name });
      }
    }}
    onDeleteRows={() => {
      // Will be wired via onApplyChanges callback in Task 5
    }}
    onGenerateDeleteSQL={() => {
      // Will be wired via onApplyChanges callback in Task 5
    }}
  />
)}
```

Add the import for `Copy` at the top if not already present (it's already in the imports at line 17).

- [ ] **Step 4: Add Escape key handler to close context menu**

Add to VirtualTableBody (in the return, wrap the scrollRef div with a key handler or use useEffect):

```typescript
useEffect(() => {
  if (!contextMenu) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setContextMenu(null);
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [contextMenu]);
```

- [ ] **Step 5: Verify build**

Run: `cd d:/code/openCode/CrabHub && npx vite build 2>&1 | tail -5`
Expected: `✓ built in ...s`

- [ ] **Step 6: Commit**

```bash
git add src/components/EditorPanel.tsx
git commit -m "feat: add right-click context menu with export, copy, edit, delete options

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Add Apply Changes toolbar and wire callbacks to EditorPanel

**Files:**
- Modify: `src/components/EditorPanel.tsx` (ResultTable interface and implementation, EditorPanel wiring)

- [ ] **Step 1: Extend ResultTableProps and VirtualTableBody props**

Update `ResultTableProps` (line 1659):
```typescript
interface ResultTableProps {
  result?: QueryResult;
  importPreview?: { columns: string[]; rows: any[] } | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onApplyChanges?: (modifiedCells: Map<string, any>, columns: any[], rows: any[]) => void;
  onDeleteRows?: (rowIndices: number[]) => void;
  onGenerateDeleteSQL?: (rowIndices: number[]) => void;
}
```

Update `VirtualTableBody` props to add:
```typescript
  onApplyChanges?: () => void;
  onDeleteRows?: () => void;
  onGenerateDeleteSQL?: () => void;
```

- [ ] **Step 2: Add Apply Changes toolbar to ResultTable**

In ResultTable's `flex flex-col h-full` div (line 1722), add a toolbar between VirtualTableBody and the bottom status bar:

```typescript
{modifiedCellsCount > 0 && (
  <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border shrink-0 bg-orange-500/10">
    <span className="text-[11px] text-orange-500">
      {t('table.changesPending', { count: String(modifiedCellsCount) })}
    </span>
    <div className="flex-1" />
    <button
      onClick={handleDiscardChanges}
      className="px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
    >
      {t('table.discardChanges')}
    </button>
    <button
      onClick={handleApplyChanges}
      className="px-3 py-0.5 text-[11px] text-white rounded transition-colors"
      style={{ backgroundColor: 'hsl(var(--tab-active))' }}
    >
      {t('table.applyChanges')}
    </button>
  </div>
)}
```

But wait — `modifiedCellsCount`, `handleDiscardChanges`, and `handleApplyChanges` need to be lifted up. We need a different approach.

**Revised approach:** Lift the `modifiedCells` state up to `ResultTable`, since both the toolbar and VirtualTableBody need access.

Actually, the cleanest approach: `VirtualTableBody` manages `modifiedCells` internally AND exposes it. But React doesn't support that easily from a child component.

**Better approach:** Use a callback pattern. VirtualTableBody calls `onModifiedCellsChange` whenever modifiedCells changes, and ResultTable tracks the count + exposes `onDiscard` and `onApply` callbacks.

In VirtualTableBody's props, add:
```typescript
onModifiedCellsChange?: (count: number, getCells: () => Map<string, any>) => void;
```

In VirtualTableBody, after each `setModifiedCells`, notify parent:
```typescript
useEffect(() => {
  onModifiedCellsChange?.(modifiedCells.size, () => modifiedCells);
}, [modifiedCells.size, onModifiedCellsChange]);
```

In ResultTable, track:
```typescript
const [modifiedCount, setModifiedCount] = useState(0);
const modifiedCellsRef = useRef<() => Map<string, any>>(() => new Map());

const handleModifiedCellsChange = useCallback((count: number, getCells: () => Map<string, any>) => {
  setModifiedCount(count);
  modifiedCellsRef.current = getCells;
}, []);
```

Then pass to VirtualTableBody:
```typescript
<VirtualTableBody
  ...
  onModifiedCellsChange={handleModifiedCellsChange}
/>
```

And the toolbar:
```typescript
{modifiedCount > 0 && (
  <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border shrink-0 bg-orange-500/10">
    <span className="text-[11px] text-foreground">{t('table.changesPending', { count: String(modifiedCount) })}</span>
    <div className="flex-1" />
    <button
      onClick={() => { /* discard - need to reset state in VirtualTableBody */ }}
      className="px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
    >
      {t('table.discardChanges')}
    </button>
    <button
      onClick={() => onApplyChanges?.(modifiedCellsRef.current(), columns, rows)}
      className="px-3 py-0.5 text-[11px] text-white rounded transition-colors"
      style={{ backgroundColor: 'hsl(var(--tab-active))' }}
    >
      {t('table.applyChanges')}
    </button>
  </div>
)}
```

For "Discard Changes", we need a ref-based approach: VirtualTableBody exposes a reset function via a ref or callback. Let's use a callback prop:

In VirtualTableBody props add: `discardRef: React.MutableRefObject<(() => void) | null>`

And inside VirtualTableBody:
```typescript
discardRef.current = () => {
  setModifiedCells(new Map());
  setEditingCell(null);
};
```

In ResultTable:
```typescript
const discardRef = useRef<(() => void) | null>(null);
// ...
<button onClick={() => discardRef.current?.()}>Discard</button>
// ...
<VirtualTableBody discardRef={discardRef} ... />
```

- [ ] **Step 3: Wire EditorPanel callbacks**

In the EditorPanel component where ResultTable is rendered (~line 1503), add the callbacks. The activeTab and editorRef are available in the component scope:

```typescript
<ResultTable
  result={result}
  importPreview={importPreview}
  hasMore={loadMoreState[activeResultIdx]?.hasMore ?? false}
  isLoadingMore={isLoadingMore}
  onLoadMore={() => handleLoadMore(activeResultIdx)}
  onApplyChanges={async (modifiedCells, columns, rows) => {
    if (!activeTab?.tableName || !effectiveConnectionId) return;
    // Group modified cells by row
    const rowGroups = new Map<number, [string, any][]>();
    for (const [key, value] of modifiedCells.entries()) {
      const [rowIdx, colName] = key.split(':');
      const idx = parseInt(rowIdx);
      if (!rowGroups.has(idx)) rowGroups.set(idx, []);
      rowGroups.get(idx)!.push([colName, value]);
    }
    for (const [rowIdx, updates] of rowGroups.entries()) {
      const row = rows[rowIdx];
      const whereClause = buildWhereClause(columns, row);
      await updateTableRows(effectiveConnectionId, activeTab.tableName, updates, whereClause, activeTab.schemaName);
    }
    // Re-execute query to refresh
    handleExecute();
    showToast?.(t('table.changesApplied'));
  }}
  onDeleteRows={async (rowIndices) => {
    if (!activeTab?.tableName || !effectiveConnectionId) return;
    const msg = t('table.deleteConfirm', { count: String(rowIndices.length) });
    if (!window.confirm(msg)) return;
    for (const idx of rowIndices) {
      const row = rows[idx];
      const whereClause = buildWhereClause(columns, row);
      await deleteTableRows(effectiveConnectionId, activeTab.tableName, whereClause, activeTab.schemaName);
    }
    handleExecute();
  }}
  onGenerateDeleteSQL={(rowIndices) => {
    const statements = rowIndices.map(idx => {
      const row = rows[idx];
      const whereClause = buildWhereClause(columns, row);
      return `DELETE FROM ${activeTab?.schemaName ? `"${activeTab.schemaName}".` : ''}"${activeTab?.tableName || 'table'}" WHERE ${whereClause};`;
    }).join('\n');
    const editor = editorRef.current;
    if (editor) {
      const selection = editor.getSelection();
      editor.executeEdits('delete-sql', [{
        range: selection || editor.getModel()?.getFullModelRange(),
        text: statements,
      }]);
    }
  }}
/>
```

Add the necessary imports at the top of the file:
```typescript
import { buildWhereClause } from "@/lib/export";
import { updateTableRows, deleteTableRows } from "@/lib/tauri-commands";
```

Check if `showToast` exists — if not, just log to console for now.

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd d:/code/openCode/CrabHub && npx tsc --noEmit --pretty 2>&1 | grep -i "EditorPanel" || echo "No EditorPanel errors"`
Expected: No EditorPanel errors

- [ ] **Step 5: Verify build**

Run: `cd d:/code/openCode/CrabHub && npx vite build 2>&1 | tail -5`
Expected: `✓ built in ...s`

- [ ] **Step 6: Commit**

```bash
git add src/components/EditorPanel.tsx
git commit -m "feat: wire Apply Changes toolbar, delete, and generate DELETE SQL callbacks

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
