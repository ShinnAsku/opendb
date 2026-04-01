import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  Play,
  Save,
  Copy,
  GripVertical,
  Eye,
  FileCode,
  Loader2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { t } from "@/lib/i18n";
import { DATA_TYPES, DATA_TYPE_CATEGORIES, getDataTypeInfo, type DataType } from "@/lib/data-types";
import { generateCreateTable, generateAlterTable, type ColumnDef, type TableDef } from "@/lib/ddl-generator";
import { executeSql, getColumns, getSchemas } from "@/lib/tauri-commands";

interface TableDesignerProps {
  connectionId?: string;
  editTable?: { name: string; schema?: string };
}

function createDefaultColumn(): ColumnDef {
  return {
    name: "",
    dataType: "integer",
    length: undefined,
    precision: undefined,
    scale: undefined,
    nullable: true,
    primaryKey: false,
    autoIncrement: false,
    defaultValue: "",
    comment: "",
    unique: false,
  };
}

function TableDesigner({ connectionId, editTable }: TableDesignerProps) {
  const { connections, activeConnectionId, addTab, language } = useAppStore();

  const connId = connectionId || activeConnectionId;
  const connection = connections.find((c) => c.id === connId);
  const dbType = connection?.type || "postgresql";

  const [tableName, setTableName] = useState(editTable?.name || "");
  const [schema, setSchema] = useState(editTable?.schema || "");
  const [tableComment, setTableComment] = useState("");
  const [columns, setColumns] = useState<ColumnDef[]>([createDefaultColumn()]);
  const [engine, setEngine] = useState("");
  const [charset, setCharset] = useState("utf8mb4");
  const [orderBy, setOrderBy] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [messages, setMessages] = useState<{ type: "success" | "error"; text: string }[]>([]);
  const [typeFilter, setTypeFilter] = useState<DataType["category"] | "all">("all");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalColumns, setOriginalColumns] = useState<ColumnDef[]>([]);

  // Load schemas for the connection
  useEffect(() => {
    if (!connId) return;
    const loadSchemas = async () => {
      try {
        const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
        if (!isTauri) return;
        const s = await getSchemas(connId);
        setSchemas(s);
      } catch {
        // ignore
      }
    };
    loadSchemas();
  }, [connId]);

  // Load existing table columns for editing
  useEffect(() => {
    if (!editTable || !connId) return;
    const loadColumns = async () => {
      try {
        const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
        if (!isTauri) return;
        const cols = await getColumns(connId, editTable.name, editTable.schema);
        const columnDefs: ColumnDef[] = cols.map((c) => ({
          name: c.name,
          dataType: c.dataType,
          nullable: c.nullable,
          primaryKey: c.isPrimaryKey,
          autoIncrement: false,
          defaultValue: c.defaultValue || "",
          comment: c.comment || "",
          unique: false,
        }));
        setColumns(columnDefs.length > 0 ? columnDefs : [createDefaultColumn()]);
        setOriginalColumns(columnDefs);
        setIsEditMode(true);
      } catch {
        setColumns([createDefaultColumn()]);
      }
    };
    loadColumns();
  }, [editTable, connId]);

  // Generate SQL preview
  const sqlPreview = useMemo(() => {
    if (!tableName.trim() || columns.every((c) => !c.name.trim())) return "";

    if (isEditMode && editTable) {
      // Generate ALTER TABLE diff
      const changes: { type: "add" | "drop" | "modify"; column?: ColumnDef; oldName?: string }[] = [];

      // Check for dropped columns
      for (const orig of originalColumns) {
        if (!columns.find((c) => c.name === orig.name)) {
          changes.push({ type: "drop", oldName: orig.name });
        }
      }

      // Check for added or modified columns
      for (const col of columns) {
        if (!col.name.trim()) continue;
        const orig = originalColumns.find((c) => c.name === col.name);
        if (!orig) {
          changes.push({ type: "add", column: col });
        } else {
          // Check if modified
          const isModified =
            col.dataType !== orig.dataType ||
            col.nullable !== orig.nullable ||
            col.defaultValue !== orig.defaultValue ||
            col.comment !== orig.comment;
          if (isModified) {
            changes.push({ type: "modify", column: col });
          }
        }
      }

      if (changes.length === 0) return "-- No changes detected";
      return generateAlterTable(editTable.name, editTable.schema, changes, dbType);
    }

    const def: TableDef = {
      name: tableName,
      schema: schema || undefined,
      columns: columns.filter((c) => c.name.trim()),
      comment: tableComment || undefined,
      engine: engine || undefined,
      charset: (dbType === "mysql" ? charset : undefined) || undefined,
      orderBy: (dbType === "clickhouse" ? orderBy : undefined) || undefined,
    };
    return generateCreateTable(def, dbType);
  }, [tableName, schema, tableComment, columns, engine, charset, orderBy, dbType, isEditMode, editTable, originalColumns]);

  // Column operations
  const addColumn = useCallback(() => {
    setColumns((prev) => [...prev, createDefaultColumn()]);
  }, []);

  const removeColumn = useCallback((index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateColumn = useCallback((index: number, updates: Partial<ColumnDef>) => {
    setColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, ...updates } : col))
    );
  }, []);

  const moveColumn = useCallback((fromIndex: number, toIndex: number) => {
    setColumns((prev) => {
      const newCols = [...prev];
      const moved = newCols[fromIndex];
      if (!moved) return prev;
      newCols.splice(fromIndex, 1);
      newCols.splice(toIndex, 0, moved);
      return newCols;
    });
  }, []);

  // Execute SQL
  const handleExecute = useCallback(async () => {
    if (!connId || !sqlPreview) return;
    setIsExecuting(true);
    setMessages([]);
    try {
      await executeSql(connId, sqlPreview);
      setMessages([{ type: "success", text: t("designer.executeSuccess") }]);
      if (isEditMode) {
        setOriginalColumns([...columns]);
      }
    } catch (err) {
      setMessages([
        {
          type: "error",
          text: t("designer.executeFailed") + ": " + (err instanceof Error ? err.message : t("common.unknownError")),
        },
      ]);
    } finally {
      setIsExecuting(false);
    }
  }, [connId, sqlPreview, isEditMode, columns]);

  // Save as snippet (open in a new query tab)
  const handleSaveAsSnippet = useCallback(() => {
    if (!sqlPreview) return;
    addTab({
      title: t("designer.snippetTitle", { table: tableName || "table" }),
      type: "query",
      content: sqlPreview,
      connectionId: connId || undefined,
      modified: false,
    });
  }, [sqlPreview, tableName, connId, addTab]);

  // Copy SQL
  const handleCopy = useCallback(() => {
    if (!sqlPreview) return;
    navigator.clipboard.writeText(sqlPreview).then(() => {
      setMessages([{ type: "success", text: t("designer.copied") }]);
    });
  }, [sqlPreview]);

  // Drag handlers
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      moveColumn(dragIndex, index);
      setDragIndex(index);
    }
  }, [dragIndex, moveColumn]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  // Filtered data types
  const filteredTypes = useMemo(() => {
    const allTypes = DATA_TYPES[dbType] || [];
    if (typeFilter === "all") return allTypes;
    return allTypes.filter((t) => t.category === typeFilter);
  }, [dbType, typeFilter]);

  const typeInfoForColumn = useCallback(
    (col: ColumnDef) => getDataTypeInfo(dbType, col.dataType),
    [dbType]
  );

  // Render
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <FileCode size={14} className="text-[hsl(var(--tab-active))]" />
          <span className="text-xs font-medium text-foreground">
            {isEditMode ? t("designer.editTable") : t("designer.createTable")}
          </span>
          {connection && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {connection.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded transition-colors ${
              showPreview
                ? "bg-[hsl(var(--tab-active))] text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Eye size={11} />
            {t("designer.previewSql")}
          </button>
          <button
            onClick={handleCopy}
            disabled={!sqlPreview}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-40"
          >
            <Copy size={11} />
            {t("common.copy")}
          </button>
          <button
            onClick={handleSaveAsSnippet}
            disabled={!sqlPreview}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-40"
          >
            <Save size={11} />
            {t("designer.saveSnippet")}
          </button>
          <button
            onClick={handleExecute}
            disabled={!sqlPreview || !connId || isExecuting}
            className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] bg-[hsl(var(--tab-active))] text-white rounded hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isExecuting ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Play size={11} />
            )}
            {t("common.execute")}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Designer Panel */}
        <div className={`flex flex-col ${showPreview ? "w-[55%]" : "w-full"} min-w-0 border-r border-border`}>
          {/* Table Properties */}
          <div className="px-3 py-2 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted-foreground w-16 shrink-0">
                {t("designer.tableName")}
              </label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder={t("designer.tableNamePlaceholder")}
                className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:border-[hsl(var(--tab-active))] text-foreground"
              />
              {schemas.length > 0 && (
                <>
                  <label className="text-[11px] text-muted-foreground w-12 shrink-0">
                    {t("designer.schema")}
                  </label>
                  <select
                    value={schema}
                    onChange={(e) => setSchema(e.target.value)}
                    className="px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:border-[hsl(var(--tab-active))] text-foreground"
                  >
                    <option value="">--</option>
                    {schemas.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted-foreground w-16 shrink-0">
                {t("designer.comment")}
              </label>
              <input
                type="text"
                value={tableComment}
                onChange={(e) => setTableComment(e.target.value)}
                placeholder={t("designer.commentPlaceholder")}
                className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:border-[hsl(var(--tab-active))] text-foreground"
              />
            </div>
            {/* MySQL options */}
            {dbType === "mysql" && (
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-muted-foreground w-16 shrink-0">
                  ENGINE
                </label>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  className="px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:border-[hsl(var(--tab-active))] text-foreground"
                >
                  <option value="">InnoDB</option>
                  <option value="MyISAM">MyISAM</option>
                  <option value="MEMORY">MEMORY</option>
                  <option value="CSV">CSV</option>
                  <option value="ARCHIVE">ARCHIVE</option>
                </select>
                <label className="text-[11px] text-muted-foreground w-16 shrink-0 ml-2">
                  CHARSET
                </label>
                <select
                  value={charset}
                  onChange={(e) => setCharset(e.target.value)}
                  className="px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:border-[hsl(var(--tab-active))] text-foreground"
                >
                  <option value="utf8mb4">utf8mb4</option>
                  <option value="utf8">utf8</option>
                  <option value="latin1">latin1</option>
                  <option value="ascii">ascii</option>
                </select>
              </div>
            )}
            {/* ClickHouse options */}
            {dbType === "clickhouse" && (
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-muted-foreground w-16 shrink-0">
                  ENGINE
                </label>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  className="px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:border-[hsl(var(--tab-active))] text-foreground"
                >
                  <option value="">MergeTree()</option>
                  <option value="ReplacingMergeTree()">ReplacingMergeTree()</option>
                  <option value="SummingMergeTree()">SummingMergeTree()</option>
                  <option value="AggregatingMergeTree()">AggregatingMergeTree()</option>
                  <option value="CollapsingMergeTree()">CollapsingMergeTree()</option>
                  <option value="TinyLog">TinyLog</option>
                </select>
                <label className="text-[11px] text-muted-foreground w-16 shrink-0 ml-2">
                  ORDER BY
                </label>
                <input
                  type="text"
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value)}
                  placeholder="column_name"
                  className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded outline-none focus:border-[hsl(var(--tab-active))] text-foreground"
                />
              </div>
            )}
          </div>

          {/* Column List Header */}
          <div className="px-3 py-1.5 border-b border-border flex items-center justify-between shrink-0">
            <span className="text-[11px] text-muted-foreground">
              {t("designer.columns")} ({columns.filter((c) => c.name.trim()).length})
            </span>
            <div className="flex items-center gap-1">
              {/* Type category filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as DataType["category"] | "all")}
                className="px-1.5 py-0.5 text-[10px] bg-background border border-border rounded outline-none focus:border-[hsl(var(--tab-active))] text-muted-foreground"
              >
                <option value="all">{language === "zh" ? "全部类型" : "All Types"}</option>
                {DATA_TYPE_CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {language === "zh" ? cat.labelZh : cat.labelEn}
                  </option>
                ))}
              </select>
              <button
                onClick={addColumn}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[hsl(var(--tab-active))] hover:bg-[hsl(var(--tab-active))]/10 rounded transition-colors"
              >
                <Plus size={10} />
                {t("designer.addColumn")}
              </button>
            </div>
          </div>

          {/* Column List */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted text-muted-foreground">
                  <th className="w-6 px-1 py-1.5 text-center border-b border-border" />
                  <th className="px-2 py-1.5 text-left font-medium border-b border-border min-w-[120px]">
                    {t("designer.colName")}
                  </th>
                  <th className="px-2 py-1.5 text-left font-medium border-b border-border min-w-[130px]">
                    {t("designer.colType")}
                  </th>
                  <th className="px-2 py-1.5 text-left font-medium border-b border-border w-[70px]">
                    {t("designer.colLength")}
                  </th>
                  <th className="px-2 py-1.5 text-center font-medium border-b border-border w-[40px]">
                    PK
                  </th>
                  <th className="px-2 py-1.5 text-center font-medium border-b border-border w-[40px]">
                    NN
                  </th>
                  <th className="px-2 py-1.5 text-center font-medium border-b border-border w-[40px]">
                    UQ
                  </th>
                  <th className="px-2 py-1.5 text-center font-medium border-b border-border w-[40px]">
                    AI
                  </th>
                  <th className="px-2 py-1.5 text-left font-medium border-b border-border min-w-[80px]">
                    {t("designer.colDefault")}
                  </th>
                  <th className="px-2 py-1.5 text-left font-medium border-b border-border min-w-[80px]">
                    {t("designer.colComment")}
                  </th>
                  <th className="w-8 px-1 py-1.5 text-center border-b border-border" />
                </tr>
              </thead>
              <tbody>
                {columns.map((col, index) => {
                  const info = typeInfoForColumn(col);
                  return (
                    <tr
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                        dragIndex === index ? "opacity-50" : ""
                      }`}
                    >
                      {/* Drag handle */}
                      <td className="px-1 py-1 text-center text-muted-foreground/40 cursor-grab active:cursor-grabbing">
                        <GripVertical size={12} />
                      </td>

                      {/* Column Name */}
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => updateColumn(index, { name: e.target.value })}
                          placeholder="column_name"
                          className="w-full px-1.5 py-0.5 text-xs bg-transparent border border-transparent hover:border-border focus:border-[hsl(var(--tab-active))] rounded outline-none text-foreground"
                        />
                      </td>

                      {/* Data Type */}
                      <td className="px-1 py-1">
                        <select
                          value={col.dataType}
                          onChange={(e) => {
                            const newType = e.target.value;
                            const newInfo = getDataTypeInfo(dbType, newType);
                            updateColumn(index, {
                              dataType: newType,
                              length: newInfo?.hasLength ? (col.length || 255) : undefined,
                              precision: newInfo?.hasPrecision ? col.precision : undefined,
                              scale: newInfo?.hasScale ? col.scale : undefined,
                            });
                          }}
                          className="w-full px-1.5 py-0.5 text-xs bg-transparent border border-transparent hover:border-border focus:border-[hsl(var(--tab-active))] rounded outline-none text-foreground"
                        >
                          {filteredTypes.map((dt) => (
                            <option key={dt.name} value={dt.name}>
                              {dt.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Length/Precision */}
                      <td className="px-1 py-1">
                        {info?.hasLength && (
                          <input
                            type="number"
                            value={col.length || ""}
                            onChange={(e) =>
                              updateColumn(index, { length: e.target.value ? Number(e.target.value) : undefined })
                            }
                            placeholder="255"
                            className="w-full px-1.5 py-0.5 text-xs bg-transparent border border-transparent hover:border-border focus:border-[hsl(var(--tab-active))] rounded outline-none text-foreground"
                          />
                        )}
                        {info?.hasPrecision && (
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              value={col.precision ?? ""}
                              onChange={(e) =>
                                updateColumn(index, { precision: e.target.value ? Number(e.target.value) : undefined })
                              }
                              placeholder="10"
                              className="w-full px-1.5 py-0.5 text-xs bg-transparent border border-transparent hover:border-border focus:border-[hsl(var(--tab-active))] rounded outline-none text-foreground"
                            />
                            {info?.hasScale && (
                              <input
                                type="number"
                                value={col.scale ?? ""}
                                onChange={(e) =>
                                  updateColumn(index, { scale: e.target.value ? Number(e.target.value) : undefined })
                                }
                                placeholder="2"
                                className="w-full px-1.5 py-0.5 text-xs bg-transparent border border-transparent hover:border-border focus:border-[hsl(var(--tab-active))] rounded outline-none text-foreground"
                              />
                            )}
                          </div>
                        )}
                      </td>

                      {/* Primary Key */}
                      <td className="px-1 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={col.primaryKey}
                          onChange={(e) => updateColumn(index, { primaryKey: e.target.checked, nullable: !e.target.checked })}
                          className="w-3 h-3 accent-[hsl(var(--tab-active))]"
                          title={t("designer.primaryKey")}
                        />
                      </td>

                      {/* Not Null */}
                      <td className="px-1 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={!col.nullable}
                          onChange={(e) => updateColumn(index, { nullable: !e.target.checked })}
                          className="w-3 h-3 accent-[hsl(var(--tab-active))]"
                          title={t("designer.notNull")}
                        />
                      </td>

                      {/* Unique */}
                      <td className="px-1 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={col.unique || false}
                          onChange={(e) => updateColumn(index, { unique: e.target.checked })}
                          className="w-3 h-3 accent-[hsl(var(--tab-active))]"
                          title={t("designer.unique")}
                        />
                      </td>

                      {/* Auto Increment */}
                      <td className="px-1 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={col.autoIncrement}
                          onChange={(e) => updateColumn(index, { autoIncrement: e.target.checked })}
                          className="w-3 h-3 accent-[hsl(var(--tab-active))]"
                          title={t("designer.autoIncrement")}
                        />
                      </td>

                      {/* Default Value */}
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={col.defaultValue || ""}
                          onChange={(e) => updateColumn(index, { defaultValue: e.target.value })}
                          placeholder="NULL"
                          className="w-full px-1.5 py-0.5 text-xs bg-transparent border border-transparent hover:border-border focus:border-[hsl(var(--tab-active))] rounded outline-none text-foreground"
                        />
                      </td>

                      {/* Comment */}
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={col.comment || ""}
                          onChange={(e) => updateColumn(index, { comment: e.target.value })}
                          placeholder={t("designer.commentPlaceholder")}
                          className="w-full px-1.5 py-0.5 text-xs bg-transparent border border-transparent hover:border-border focus:border-[hsl(var(--tab-active))] rounded outline-none text-foreground"
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-1 py-1 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => moveColumn(index, Math.max(0, index - 1))}
                            disabled={index === 0}
                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                            title={t("designer.moveUp")}
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            onClick={() => moveColumn(index, Math.min(columns.length - 1, index + 1))}
                            disabled={index === columns.length - 1}
                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                            title={t("designer.moveDown")}
                          >
                            <ArrowDown size={10} />
                          </button>
                          <button
                            onClick={() => removeColumn(index)}
                            disabled={columns.length <= 1}
                            className="p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-20 transition-colors"
                            title={t("common.delete")}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Messages */}
          {messages.length > 0 && (
            <div className="px-3 py-1.5 border-t border-border shrink-0">
              {messages.map((msg, i) => (
                <p
                  key={i}
                  className={`text-[11px] ${
                    msg.type === "error" ? "text-destructive" : "text-green-500"
                  }`}
                >
                  {msg.type === "error" ? <X size={10} className="inline mr-1" /> : <Check size={10} className="inline mr-1" />}
                  {msg.text}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* SQL Preview Panel */}
        {showPreview && (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-3 py-1.5 border-b border-border shrink-0 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{t("designer.sqlPreview")}</span>
              <button
                onClick={handleCopy}
                disabled={!sqlPreview}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-40"
              >
                <Copy size={10} />
                {t("common.copy")}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {sqlPreview ? (
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
                  {sqlPreview}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  {t("designer.startDesigning")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TableDesigner;
