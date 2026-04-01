import { useMemo } from "react";
import { X } from "lucide-react";
import { useAppStore, type SchemaNode } from "@/stores/app-store";
import { t } from "@/lib/i18n";

interface ERDiagramProps {
  isOpen?: boolean;
  onClose?: () => void;
  connectionId?: string;
  embedded?: boolean;
  tables?: any[];
}

interface TableRect {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: { name: string; isPK: boolean; type: string }[];
}

function ERDiagram({ isOpen = true, onClose, connectionId, embedded }: ERDiagramProps) {
  const { schemaData } = useAppStore();
  const schema = schemaData[connectionId || ""] || [];

  // Extract all tables from schema
  const tables = useMemo(() => {
    const result: TableRect[] = [];
    let idx = 0;

    const extractTables = (nodes: SchemaNode[]) => {
      for (const node of nodes) {
        if (node.type === "table" || node.type === "view") {
          const cols = (node.children || []).map((c) => ({
            name: c.name,
            isPK: c.icon === "key",
            type: "",
          }));
          const colHeight = Math.max(cols.length * 18 + 28, 40);
          const colWidth = Math.max(
            ...cols.map((c) => c.name.length * 7 + 20),
            node.name.length * 8 + 30,
            120
          );

          // Grid layout: 3 tables per row
          const col = idx % 3;
          const row = Math.floor(idx / 3);

          result.push({
            name: node.name,
            x: 40 + col * (colWidth + 60),
            y: 40 + row * (colHeight + 50),
            width: colWidth,
            height: colHeight,
            columns: cols,
          });
          idx++;
        }
        if (node.children) {
          extractTables(node.children);
        }
      }
    };

    extractTables(schema);
    return result;
  }, [schema]);

  // Calculate SVG dimensions
  const svgWidth = useMemo(() => {
    if (tables.length === 0) return 800;
    return Math.max(800, ...tables.map((t) => t.x + t.width + 40));
  }, [tables]);

  const svgHeight = useMemo(() => {
    if (tables.length === 0) return 400;
    return Math.max(400, ...tables.map((t) => t.y + t.height + 40));
  }, [tables]);

  // Draw simple lines between tables (placeholder - no real FK detection)
  const connections = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    // Simple heuristic: connect tables that share column name patterns (e.g., id, *_id)
    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        const t1 = tables[i];
        const t2 = tables[j];
        if (!t1 || !t2) continue;
        const fkPattern = `${t1.name.toLowerCase()}_id`;
        const hasFK = t2.columns.some((c) => c.name.toLowerCase() === fkPattern);
        if (hasFK) {
          lines.push({
            x1: t1.x + t1.width / 2,
            y1: t1.y + t1.height,
            x2: t2.x + t2.width / 2,
            y2: t2.y,
          });
        }
      }
    }
    return lines;
  }, [tables]);

  if (!isOpen) return null;

  // When embedded, use relative positioning; otherwise use fixed overlay
  if (embedded) {
    return (
      <div className="w-full h-full overflow-auto bg-background">
        {tables.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            {t('er.noData')}
          </div>
        ) : (
          <svg width={svgWidth} height={svgHeight} className="min-w-full min-h-full">
            {/* Connection lines */}
            {connections.map((line, i) => (
              <line
                key={i}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="hsl(var(--tab-active))"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                opacity="0.5"
              />
            ))}

            {/* Table boxes */}
            {tables.map((table) => (
              <g key={table.name}>
                {/* Table header */}
                <rect
                  x={table.x}
                  y={table.y}
                  width={table.width}
                  height={24}
                  rx={4}
                  ry={4}
                  fill="hsl(var(--tab-active))"
                  opacity="0.9"
                />
                <rect
                  x={table.x}
                  y={table.y + 20}
                  width={table.width}
                  height={4}
                  fill="hsl(var(--tab-active))"
                  opacity="0.9"
                />
                <text
                  x={table.x + 8}
                  y={table.y + 16}
                  fill="white"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {table.name}
                </text>

                {/* Table body */}
                <rect
                  x={table.x}
                  y={table.y + 24}
                  width={table.width}
                  height={table.height - 24}
                  fill="var(--color-background)"
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  rx="0"
                  ry="0"
                />
                {/* Bottom rounded corners */}
                <rect
                  x={table.x}
                  y={table.y + table.height - 4}
                  width={table.width}
                  height={4}
                  fill="var(--color-background)"
                  rx="4"
                  ry="4"
                />

                {/* Columns */}
                {table.columns.map((col, ci) => (
                  <g key={col.name}>
                    <text
                      x={table.x + 8}
                      y={table.y + 40 + ci * 18}
                      fill={col.isPK ? "hsl(var(--tab-active))" : "var(--color-muted-foreground)"}
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {col.isPK ? "PK " : "   "}
                      {col.name}
                    </text>
                  </g>
                ))}
              </g>
            ))}
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[90vw] h-[85vh] bg-background border border-border rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{t('er.title')}</span>
            <span className="text-[10px] text-muted-foreground">
              {t('er.tableCount', { count: String(tables.length) })}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* SVG Canvas */}
        <div className="flex-1 overflow-auto bg-muted/10">
          {tables.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              {t('er.noData')}
            </div>
          ) : (
            <svg width={svgWidth} height={svgHeight} className="min-w-full min-h-full">
              {/* Connection lines */}
              {connections.map((line, i) => (
                <line
                  key={i}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="hsl(var(--tab-active))"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  opacity="0.5"
                />
              ))}

              {/* Table boxes */}
              {tables.map((table) => (
                <g key={table.name}>
                  {/* Table header */}
                  <rect
                    x={table.x}
                    y={table.y}
                    width={table.width}
                    height={24}
                    rx={4}
                    ry={4}
                    fill="hsl(var(--tab-active))"
                    opacity="0.9"
                  />
                  <rect
                    x={table.x}
                    y={table.y + 20}
                    width={table.width}
                    height={4}
                    fill="hsl(var(--tab-active))"
                    opacity="0.9"
                  />
                  <text
                    x={table.x + 8}
                    y={table.y + 16}
                    fill="white"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {table.name}
                  </text>

                  {/* Table body */}
                  <rect
                    x={table.x}
                    y={table.y + 24}
                    width={table.width}
                    height={table.height - 24}
                    fill="var(--color-background)"
                    stroke="var(--color-border)"
                    strokeWidth="1"
                    rx="0"
                    ry="0"
                  />
                  {/* Bottom rounded corners */}
                  <rect
                    x={table.x}
                    y={table.y + table.height - 4}
                    width={table.width}
                    height={4}
                    fill="var(--color-background)"
                    rx="4"
                    ry="4"
                  />

                  {/* Columns */}
                  {table.columns.map((col, ci) => (
                    <g key={col.name}>
                      <text
                        x={table.x + 8}
                        y={table.y + 40 + ci * 18}
                        fill={col.isPK ? "hsl(var(--tab-active))" : "var(--color-muted-foreground)"}
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {col.isPK ? "PK " : "   "}
                        {col.name}
                      </text>
                    </g>
                  ))}
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export default ERDiagram;
