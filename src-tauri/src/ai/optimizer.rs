use crate::ai::types::{IndexSuggestion, OptimizationSuggestion};
use regex::Regex;

pub struct SQLOptimizer;

impl SQLOptimizer {
    /// Analyze SQL query for performance issues
    pub fn analyze(sql: &str) -> Vec<OptimizationSuggestion> {
        let mut suggestions = Vec::new();
        let sql_upper = sql.to_uppercase();

        // Check for SELECT *
        if sql_upper.contains("SELECT *") || sql_upper.contains("SELECT  *") {
            suggestions.push(OptimizationSuggestion {
                r#type: "Performance".to_string(),
                severity: "Medium".to_string(),
                message: "Avoid using SELECT * - it retrieves all columns which may include unnecessary data".to_string(),
                suggestion: Some("Explicitly list only the columns you need".to_string()),
            });
        }

        // Check for missing WHERE clause in UPDATE/DELETE
        if (sql_upper.contains("UPDATE") || sql_upper.contains("DELETE"))
            && !sql_upper.contains("WHERE")
        {
            suggestions.push(OptimizationSuggestion {
                r#type: "Safety".to_string(),
                severity: "High".to_string(),
                message: "UPDATE/DELETE without WHERE clause will affect ALL rows".to_string(),
                suggestion: Some("Add a WHERE clause to limit affected rows".to_string()),
            });
        }

        // Check for missing LIMIT in SELECT
        if sql_upper.contains("SELECT") && !sql_upper.contains("LIMIT") && !sql_upper.contains("WHERE") {
            suggestions.push(OptimizationSuggestion {
                r#type: "Performance".to_string(),
                severity: "Low".to_string(),
                message: "SELECT without LIMIT or WHERE may return large result sets".to_string(),
                suggestion: Some("Consider adding LIMIT clause to restrict result size".to_string()),
            });
        }

        // Check for LIKE with leading wildcard
        let like_regex = Regex::new(r#"LIKE\s*['"]%"#).unwrap_or_else(|_| Regex::new(r"LIKE '%'").unwrap());
        if like_regex.is_match(&sql_upper) {
            suggestions.push(OptimizationSuggestion {
                r#type: "Performance".to_string(),
                severity: "Medium".to_string(),
                message: "LIKE with leading wildcard (%) prevents index usage".to_string(),
                suggestion: Some("Consider using full-text search or restructure query".to_string()),
            });
        }

        // Check for subqueries that could be JOINs
        if sql_upper.contains("IN (SELECT") || sql_upper.contains("EXISTS (SELECT") {
            suggestions.push(OptimizationSuggestion {
                r#type: "Performance".to_string(),
                severity: "Medium".to_string(),
                message: "Subqueries can often be rewritten as JOINs for better performance".to_string(),
                suggestion: Some("Consider rewriting subquery as JOIN".to_string()),
            });
        }

        // Check for ORDER BY without LIMIT
        if sql_upper.contains("ORDER BY") && !sql_upper.contains("LIMIT") {
            suggestions.push(OptimizationSuggestion {
                r#type: "Performance".to_string(),
                severity: "Low".to_string(),
                message: "ORDER BY without LIMIT requires sorting entire result set".to_string(),
                suggestion: Some("Add LIMIT clause if you only need top N rows".to_string()),
            });
        }

        // Check for multiple OR conditions on same column
        let or_count = sql_upper.matches(" OR ").count();
        if or_count >= 2 {
            suggestions.push(OptimizationSuggestion {
                r#type: "Performance".to_string(),
                severity: "Low".to_string(),
                message: "Multiple OR conditions may be slow".to_string(),
                suggestion: Some("Consider using IN clause instead of multiple OR conditions".to_string()),
            });
        }

        // Check for function on indexed column
        let func_patterns = ["UPPER(", "LOWER(", "TRIM(", "SUBSTRING(", "DATE(", "YEAR(", "MONTH("];
        for func in &func_patterns {
            if sql_upper.contains(func) {
                suggestions.push(OptimizationSuggestion {
                    r#type: "Performance".to_string(),
                    severity: "Medium".to_string(),
                    message: format!("Function {} on column may prevent index usage", func.trim_end_matches('(')),
                    suggestion: Some("Consider using functional index or restructuring query".to_string()),
                });
                break;
            }
        }

        suggestions
    }

    /// Suggest indexes based on SQL query patterns
    pub fn suggest_indexes(sql: &str, table_name: Option<&str>) -> Vec<IndexSuggestion> {
        let mut suggestions = Vec::new();
        
        // Extract WHERE clause columns
        if let Some(where_start) = sql.to_uppercase().find("WHERE") {
            let where_clause = &sql[where_start + 5..];
            
            // Simple pattern matching for column = value
            let eq_regex = Regex::new(r"(\w+)\s*=\s*").unwrap();
            for cap in eq_regex.captures_iter(where_clause) {
                if let Some(col_match) = cap.get(1) {
                    let col_name = col_match.as_str().to_lowercase();
                    if !["and", "or", "not", "in", "like", "between"].contains(&col_name.as_str()) {
                        suggestions.push(IndexSuggestion {
                            table: table_name.unwrap_or("unknown").to_string(),
                            columns: vec![col_name],
                            reason: "Column used in WHERE equality condition".to_string(),
                            index_type: "BTREE".to_string(),
                        });
                    }
                }
            }
            
            // Check for ORDER BY columns
            if let Some(order_start) = where_clause.to_uppercase().find("ORDER BY") {
                let order_clause = &where_clause[order_start + 8..];
                let order_regex = Regex::new(r"(\w+)").unwrap();
                for col_match in order_regex.captures_iter(order_clause) {
                    if let Some(m) = col_match.get(1) {
                        let col_name = m.as_str().to_lowercase();
                        if !["asc", "desc", "nulls", "first", "last"].contains(&col_name.as_str()) {
                            suggestions.push(IndexSuggestion {
                                table: table_name.unwrap_or("unknown").to_string(),
                                columns: vec![col_name],
                                reason: "Column used in ORDER BY clause".to_string(),
                                index_type: "BTREE".to_string(),
                            });
                        }
                    }
                    break; // Only take first match
                }
            }
        }
        
        // Check for JOIN columns
        if let Some(join_start) = sql.to_uppercase().find("JOIN") {
            let join_clause = &sql[join_start..];
            let on_regex = Regex::new(r"ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)").unwrap();
            for cap in on_regex.captures_iter(join_clause) {
                if let (Some(table1), Some(col1), Some(_table2), Some(_col2)) = 
                    (cap.get(1), cap.get(2), cap.get(3), cap.get(4)) {
                    suggestions.push(IndexSuggestion {
                        table: table1.as_str().to_string(),
                        columns: vec![col1.as_str().to_lowercase()],
                        reason: "Column used in JOIN condition".to_string(),
                        index_type: "BTREE".to_string(),
                    });
                }
            }
        }
        
        suggestions
    }

    /// Rewrite query with basic optimizations
    pub fn rewrite_query(sql: &str) -> Result<String, String> {
        let mut rewritten = sql.to_string();
        
        // Convert multiple OR to IN
        // This is a simple example - full implementation would be more complex
        if rewritten.to_uppercase().matches(" OR ").count() >= 2 {
            // Pattern: col = val1 OR col = val2 OR col = val3
            let or_pattern = Regex::new(r"(\w+)\s*=\s*'([^']+)'(?:\s+OR\s+\1\s*=\s*'([^']+)')+").unwrap();
            if or_pattern.is_match(&rewritten) {
                rewritten = or_pattern.replace_all(&rewritten, |caps: &regex::Captures| {
                    let col = &caps[1];
                    let mut values = Vec::new();
                    for i in 2..=caps.len() {
                        if let Some(m) = caps.get(i) {
                            values.push(format!("'{}'", m.as_str()));
                        }
                    }
                    if values.len() > 1 {
                        format!("{} IN ({})", col, values.join(", "))
                    } else {
                        caps[0].to_string()
                    }
                }).to_string();
            }
        }
        
        Ok(rewritten)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_select_star_detection() {
        let suggestions = SQLOptimizer::analyze("SELECT * FROM users");
        assert!(suggestions.iter().any(|s| s.message.contains("SELECT *")));
    }

    #[test]
    fn test_where_clause_check() {
        let suggestions = SQLOptimizer::analyze("DELETE FROM users");
        assert!(suggestions.iter().any(|s| s.severity == "High"));
    }

    #[test]
    fn test_limit_suggestion() {
        let suggestions = SQLOptimizer::analyze("SELECT * FROM users ORDER BY created_at");
        assert!(suggestions.iter().any(|s| s.message.contains("LIMIT")));
    }
}
