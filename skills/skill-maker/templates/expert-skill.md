# Expert Skill Template

Template for complex skills with multiple domains and subdirectories.

---

## When to Use

- Skill covers multiple distinct domains
- Extensive reference documentation needed
- Users typically need one domain at a time
- Want to minimize context consumption

---

## Directory Structure

```
expert-skill/
├── SKILL.md                 # Overview + navigation (< 500 lines)
├── references/              # Domain-organized docs
│   ├── domain-a.md
│   ├── domain-b.md
│   └── domain-c.md
├── scripts/                 # Optional utilities
│   ├── helper_a.py
│   └── helper_b.py
├── templates/               # Optional boilerplate
│   ├── template_a.txt
│   └── template_b.txt
└── examples/                # Optional examples
    └── common_workflows.md
```

---

## SKILL.md Template

```markdown
---
name: [skill-name]
description: |
  [What it does]. [Multiple domains covered].
  Use when [context]. Keywords: [k1], [k2], [k3].
---

# [Skill Title]

[Brief overview: What domains/capabilities this skill covers]

## Available Domains

| Domain | Description | Reference |
|--------|-------------|-----------|
| **[Domain A]** | [Brief description] | [references/domain-a.md](references/domain-a.md) |
| **[Domain B]** | [Brief description] | [references/domain-b.md](references/domain-b.md) |
| **[Domain C]** | [Brief description] | [references/domain-c.md](references/domain-c.md) |

## Quick Start

[Minimal example for most common use case]

```[language]
[code]
```

## Common Workflows

### Workflow 1: [Name]

1. [Step 1]
2. [Step 2]
3. [Step 3]

See [references/domain-a.md](references/domain-a.md) for details.

### Workflow 2: [Name]

1. [Step 1]
2. [Step 2]

See [references/domain-b.md](references/domain-b.md) for details.

## Utility Scripts

Available scripts:
- `helper_a.py`: [What it does]
- `helper_b.py`: [What it does]

## Navigation Tips

- For [use case A] → See [references/domain-a.md](references/domain-a.md)
- For [use case B] → See [references/domain-b.md](references/domain-b.md)
- For [use case C] → See [references/domain-c.md](references/domain-c.md)
```

---

## Domain File Template

Each domain file in `references/`:

```markdown
# [Domain Name]

[Overview of this domain]

## Key Concepts

[Essential ideas for this domain]

## [Subtopic 1]

[Content]

```[language]
[examples]
```

## [Subtopic 2]

[Content]

```[language]
[examples]
```

## Common Patterns

[Frequently used patterns for this domain]

## Best Practices

[Domain-specific best practices]

## Examples

[Working examples]
```

---

## Complete Example: BigQuery Analyst

### SKILL.md

```markdown
---
name: bigquery-analyst
description: |
  BigQuery data analysis expert. Queries revenue, sales, product, and
  marketing data. Knows table schemas, common patterns, optimization.
  Use when querying BigQuery or analyzing company data.
  Keywords: bigquery, sql, data, analytics, query, warehouse, finance,
  sales, product, marketing.
---

# BigQuery Data Analyst

Expert in querying company data across multiple domains using BigQuery.

## Available Domains

| Domain | Description | Reference |
|--------|-------------|-----------|
| **Finance** | Revenue, ARR, billing metrics | [references/finance.md](references/finance.md) |
| **Sales** | Opportunities, pipeline, deals | [references/sales.md](references/sales.md) |
| **Product** | API usage, features, adoption | [references/product.md](references/product.md) |
| **Marketing** | Campaigns, attribution, email | [references/marketing.md](references/marketing.md) |

## Quick Start

Basic revenue query:
```sql
SELECT date, SUM(amount) as total
FROM `company.finance.revenue_daily`
WHERE date >= '2025-01-01'
  AND account_type != 'test'
GROUP BY date
ORDER BY date;
```

## Common Workflows

### Workflow 1: Monthly Revenue Report

1. Query revenue_daily table
2. Filter test accounts
3. Group by month
4. Calculate growth rate

See [references/finance.md](references/finance.md) for complete examples.

### Workflow 2: Pipeline Analysis

1. Query opportunities table
2. Filter by stage and date
3. Calculate conversion rates
4. Identify trends

See [references/sales.md](references/sales.md) for complete examples.

## Utility Scripts

- `build_query.py`: Generate optimized BigQuery SQL
- `validate_sql.py`: Check query syntax before running

## Navigation Tips

- For revenue/billing → [references/finance.md](references/finance.md)
- For deals/pipeline → [references/sales.md](references/sales.md)
- For usage/adoption → [references/product.md](references/product.md)
- For campaigns/attribution → [references/marketing.md](references/marketing.md)

## Quick Search

Find specific metrics:
```bash
grep -i "revenue" references/finance.md
grep -i "pipeline" references/sales.md
grep -i "api usage" references/product.md
```
```

### references/finance.md

```markdown
# Finance Data

Revenue, ARR, and billing metrics.

## Key Concepts

- **MRR**: Monthly Recurring Revenue
- **ARR**: Annual Recurring Revenue  
- **Churn**: Customer cancellations

## Tables

### revenue_daily

Daily revenue records.

| Column | Type | Description |
|--------|------|-------------|
| date | DATE | Transaction date |
| amount | FLOAT64 | Revenue amount |
| currency | STRING | Currency code (USD) |
| account_id | STRING | Customer account |
| account_type | STRING | 'live' or 'test' |

### subscriptions

Active subscriptions.

| Column | Type | Description |
|--------|------|-------------|
| subscription_id | STRING | Unique ID |
| account_id | STRING | Customer account |
| mrr | FLOAT64 | Monthly value |
| start_date | DATE | Subscription start |
| status | STRING | active, canceled, paused |

## Common Queries

### Total Revenue by Month

```sql
SELECT
  DATE_TRUNC(date, MONTH) as month,
  SUM(amount) as total_revenue
FROM `company.finance.revenue_daily`
WHERE account_type = 'live'
GROUP BY month
ORDER BY month DESC;
```

### Current MRR

```sql
SELECT SUM(mrr) as total_mrr
FROM `company.finance.subscriptions`
WHERE status = 'active';
```

### Revenue Growth Rate

```sql
WITH monthly AS (
  SELECT
    DATE_TRUNC(date, MONTH) as month,
    SUM(amount) as revenue
  FROM `company.finance.revenue_daily`
  WHERE account_type = 'live'
  GROUP BY month
)
SELECT
  month,
  revenue,
  LAG(revenue) OVER (ORDER BY month) as prev_month,
  (revenue - LAG(revenue) OVER (ORDER BY month)) / 
   LAG(revenue) OVER (ORDER BY month) * 100 as growth_rate
FROM monthly
ORDER BY month DESC;
```

## Best Practices

1. **Always filter test accounts**: `WHERE account_type != 'test'`
2. **Use DATE_TRUNC for time periods**: More efficient than formatting
3. **Optimize with partitioning**: Filter on `date` column first
4. **Cache expensive queries**: Use materialized views

## Common Mistakes

❌ **Including test accounts**: Skews metrics  
✅ **Filter**: `WHERE account_type = 'live'`

❌ **Not handling timezones**: Revenue appears on wrong day  
✅ **Use UTC**: Store and query in UTC, convert for display
```

---

## Checklist for Expert Skills

- [ ] SKILL.md stays under 500 lines
- [ ] Clear navigation to all domains
- [ ] Each domain in separate file
- [ ] Domain files are self-contained
- [ ] Table of domains in SKILL.md
- [ ] Quick start covers common case
- [ ] Navigation tips for each domain
- [ ] Scripts documented (if any)
- [ ] Search tips provided (if many domains)

---

## Tips

1. **Keep SKILL.md as navigation hub**: Don't duplicate domain content
2. **Make domains independent**: Each should work standalone
3. **Use tables for navigation**: Visual and scannable
4. **Provide search commands**: Help find content quickly
5. **Test domain isolation**: Ensure one domain loads without others
