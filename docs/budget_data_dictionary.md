Data Dictionary
The Data dictionary of the actual data coming to you from the json

Rollup.json
{
  "rollup.json": {
    "description": "Fiscal-year federal budget toplines and debt.",
    "keys": {
      "unitMeta": {
        "type": "object",
        "description": "Declares units for numeric fields.",
        "fields": {
          "outlaysDerived": {
            "type": "enum: USD_thousands | USD_millions | USD",
            "description": "Unit for OMB-derived Outlays/Mandatory/Discretionary/NetInterest and for the Outlays part of Deficit.",
            "synonyms": ["unit_outlays", "spending_units"]
          },
          "receiptsDerived": {
            "type": "enum: USD_thousands | USD_millions | USD",
            "description": "Unit for OMB-derived Receipts and for the Receipts part of Deficit.",
            "synonyms": ["unit_receipts", "revenue_units"]
          },
          "debt": {
            "type": "enum: USD",
            "description": "Unit for Treasury debt series (always full dollars).",
            "synonyms": ["unit_debt"]
          },
          "notes": {
            "type": "string",
            "description": "Free-text note about sources/units."
          }
        }
      },
      "years": {
        "type": "object<string, YearEntry>",
        "description": "Map of Fiscal Year → data object. FY is a string key, e.g., \"2018\".",
        "value_type": {
          "YearEntry": {
            "type": "object",
            "fields": {
              "outlays": {
                "type": "number",
                "units": "unitMeta.outlaysDerived",
                "description": "Total federal outlays for the fiscal year (nominal). Net of offsetting receipts, as published by OMB.",
                "synonyms": ["spending", "expenditures", "total_outlays"]
              },
              "receipts": {
                "type": "number",
                "units": "unitMeta.receiptsDerived",
                "description": "Total federal receipts for the fiscal year (nominal).",
                "synonyms": ["revenue", "collections", "total_receipts"]
              },
              "deficit": {
                "type": "number",
                "units": "uses both outlaysDerived and receiptsDerived (same scale as Outlays/Receipts)",
                "description": "Budget balance computed as outlays − receipts.",
                "sign_convention": "Positive = deficit (spending > revenue); Negative = surplus.",
                "synonyms": ["budget_balance", "surplus_deficit"]
              },
              "mandatory": {
                "type": "number",
                "units": "unitMeta.outlaysDerived",
                "description": "Aggregate mandatory outlays (e.g., Social Security, Medicare, Medicaid, certain transfers).",
                "synonyms": ["entitlements", "mandatory_spending"]
              },
              "discretionary": {
                "type": "number",
                "units": "unitMeta.outlaysDerived",
                "description": "Aggregate discretionary outlays (annual appropriations: defense + non-defense).",
                "synonyms": ["appropriations", "discretionary_spending"]
              },
              "netInterest": {
                "type": "number",
                "units": "unitMeta.outlaysDerived",
                "description": "Net interest outlays on federal debt (interest paid minus interest received).",
                "synonyms": ["interest_costs", "interest_outlays"]
              },
              "debtHeldByPublic": {
                "type": "number",
                "units": "unitMeta.debt (USD)",
                "description": "End-of-fiscal-year level of debt held by the public (Treasury DttP). For an incomplete current FY, this is the last available day in the data.",
                "optional": true,
                "synonyms": ["public_debt_eofy", "marketable_debt_eofy"]
              },
              "grossDebt": {
                "type": "number",
                "units": "unitMeta.debt (USD)",
                "description": "End-of-fiscal-year gross federal debt (public + intragovernmental).",
                "optional": true,
                "synonyms": ["total_debt_eofy", "gross_federal_debt"]
              },
              "debtHeldByPublicAvg": {
                "type": "number",
                "units": "unitMeta.debt (USD)",
                "description": "Average daily debt held by the public over the fiscal year.",
                "optional": true,
                "synonyms": ["public_debt_avg", "avg_public_debt_fy"]
              },
              "grossDebtAvg": {
                "type": "number",
                "units": "unitMeta.debt (USD)",
                "description": "Average daily gross federal debt over the fiscal year.",
                "optional": true,
                "synonyms": ["total_debt_avg", "avg_gross_debt_fy"]
              }
            },
            "relationships": [
              "deficit = outlays − receipts",
              "outlays ≈ mandatory + discretionary + netInterest (as published by OMB; minor rounding possible)"
            ],
            "nullability_notes": [
              "Debt fields may be absent before FY1994 (daily series coverage) or for future/projection years.",
              "If a component (mandatory/discretionary/netInterest) is missing, still display total outlays."
            ]
          }
        }
      }
    },
    "time_and_scope": {
      "fiscal_years": "1962–2029 (per your OMB tables). 1976 TQ excluded if ETL ran with --ignore-tq.",
      "sources": {
        "OMB": "Outlays & Receipts (wide-by-year XLSX → melted).",
        "Treasury": "Debt to the Penny daily CSV → FY End and FY Average."
      },
      "price_basis": "Nominal dollars only. No inflation adjustment in this file."
    },
    "frontend_usage_hints": {
      "formatting": [
        "Use units to scale labels: if USD_thousands, divide by 1e3 for ‘billions’ and 1e6 for ‘trillions’.",
        "Show deficit with sign-aware color: >0 red (deficit), <0 green (surplus)."
      ],
      "tooltips": [
        "`Outlays` = total federal spending (net).",
        "`Receipts` = total federal revenue.",
        "`Mandatory/Discretionary/Net interest` are components of Outlays.",
        "`Debt held by the public` is a stock (level) at FY end; not an outlay.",
        "`Gross debt` = public debt + intragovernmental holdings."
      ]
    }
  }
}
Events.json
{
  "events.json": {
    "description": "Historical macro events used for annotations, timelines, and contextual callouts across budget/markets pages.",
    "keys": {
      "items": {
        "type": "array<Event>",
        "description": "Flat list of event objects. Order not guaranteed; sort on read.",
        "value_type": {
          "Event": {
            "type": "object",
            "fields": {
              "year": {
                "type": "integer",
                "description": "Calendar year the event occurred or began.",
                "constraints": [">= 1800", "<= current_year"],
                "synonyms": ["calendar_year"]
              },
              "title": {
                "type": "string",
                "description": "Short, human-readable event name (≤ 80 chars recommended).",
                "synonyms": ["name", "headline"]
              },
              "description": {
                "type": "string",
                "description": "One-sentence summary suitable for tooltips and sidenotes (≤ 240 chars recommended).",
                "synonyms": ["summary", "blurb"]
              },
              "tags": {
                "type": "array<Tag>",
                "description": "Facets for filtering, coloring, and grouping events.",
                "items": "enum: financial-crisis | recession | war | monetary | law | policy | tax | debt | inflation | interest-rates | pandemic | oil | banking | housing | technology | trade | geopolitics",
                "synonyms": ["labels", "categories"]
              },
              "month": {
                "type": "integer",
                "description": "Month number (1–12) if known; improves timeline precision.",
                "optional": true
              },
              "day": {
                "type": "integer",
                "description": "Day of month (1–31) if known.",
                "optional": true
              },
              "endYear": {
                "type": "integer",
                "description": "Calendar year the event ended (for spans). If absent, treat as point-in-time.",
                "optional": true
              },
              "endMonth": {
                "type": "integer",
                "description": "Month number (1–12) the event ended.",
                "optional": true
              },
              "endDay": {
                "type": "integer",
                "description": "Day of month (1–31) the event ended.",
                "optional": true
              },
              "sources": {
                "type": "array<string>",
                "description": "Optional citations or URLs for the event.",
                "optional": true,
                "synonyms": ["refs", "citations"]
              },
              "importance": {
                "type": "integer",
                "description": "Relative salience (1–5). Higher = more prominent in UI.",
                "optional": true,
                "synonyms": ["weight", "salience"]
              },
              "id": {
                "type": "string",
                "description": "Stable slug or UUID. If omitted, generate from title+year at build time.",
                "optional": true,
                "synonyms": ["slug"]
              }
            },
            "derivations": [
              "date = (year, month?, day?) → ISO8601 if month/day present",
              "endDate = (endYear, endMonth?, endDay?) when span"
            ],
            "relationships": [
              "Events can be joined to fiscal data via FY = year or FY = year+1 for Oct–Dec alignment if you choose to snap by fiscal year.",
              "Tags map to color/legend groups in the timeline."
            ],
            "nullability_notes": [
              "Only `year`, `title`, `description`, and `tags` are required.",
              "If only `year` is present, render as mid-year (June 30) point for plotting unless overridden."
            ],
            "uniqueness_rules": [
              "(`title`, `year`) should be unique within the file.",
              "`id` must be unique if present."
            ],
            "validation_rules": [
              "Reject empty `title` or `description`.",
              "All `tags` must be lower-kebab-case; unknown tags allowed but should be logged."
            ]
          }
        }
      }
    },
    "time_and_scope": {
      "coverage": "Open-ended; supports 1800–present. Populate as needed.",
      "granularity": "Point-in-time or spans (start/end).",
      "sources": "Manually curated; optionally cite primary sources (e.g., Fed, Treasury, BLS, NBER)."
    },
    "frontend_usage_hints": {
      "formatting": [
        "Prefer concise titles; push detail into `description`.",
        "If span fields present, render as a band; otherwise as a lollipop/marker."
      ],
      "filtering": [
        "Use `tags` to power legend toggles and quick filters.",
        "Support multi-select tag filters; OR semantics by default."
      ],
      "alignment": [
        "For fiscal overlays, consider snapping Oct–Dec events to next FY if `snapToFiscal` feature flag is enabled."
      ],
      "accessibility": [
        "Ensure markers have aria-labels = `${title} (${year})` and tooltips mirror `description`."
      ]
    },
    "etl_notes": {
      "sort": "Sort by (year, month?, day?) ascending in build step.",
      "id_generation": "If missing, `id = slug(title) + '-' + year` with de-dup suffix if needed.",
      "de-dupe": "Normalize whitespace; case-insensitive compare on (`title`, `year`)."
    }
  }
}

Hierarchy.json
Got it — here’s a compact, schema-style data dictionary for hierarchy.json, matched to your rollup.json pattern.
{
  "hierarchy.json": {
    "description": "Budget tree for functional/organizational rollups with per-year values. Supports rendering treemaps, sunbursts, and drill-downs.",
    "keys": {
      "units": {
        "type": "object",
        "description": "Declares units for numeric value fields found under nodes[].values[year].",
        "fields": {
          "values_nominal": {
            "type": "enum: USD | USD_thousands | USD_millions",
            "description": "Unit for values.nominal."
          },
          "alt_budgetAuthority": {
            "type": "enum: USD | USD_thousands | USD_millions",
            "description": "Unit for values.budgetAuthority, if present."
          },
          "notes": {
            "type": "string",
            "optional": true,
            "description": "Free-text unit/source remark."
          }
        }
      },
      "nodes": {
        "type": "array<Node>",
        "description": "Flat list of all nodes in the budget hierarchy. Build parent/child links via parentId and path.",
        "value_type": {
          "Node": {
            "type": "object",
            "fields": {
              "id": {
                "type": "string",
                "description": "Stable, namespaced identifier. Examples: 'func:800', 'subfunc:801', 'agency:012', 'account:012-1234'.",
                "uniqueness": "required",
                "synonyms": ["key", "node_id"]
              },
              "name": {
                "type": "string",
                "description": "Human-readable display name.",
                "synonyms": ["title", "label"]
              },
              "level": {
                "type": "integer",
                "description": "Depth in the tree. Root = 1. Children = parent.level + 1.",
                "constraints": [">= 1"]
              },
              "kind": {
                "type": "string",
                "description": "Semantic node type.",
                "enum_open": true,
                "enum_examples": ["FUNCTION", "SUBFUNCTION", "AGENCY", "BUREAU", "ACCOUNT", "CATEGORY"]
              },
              "parentId": {
                "type": "string | null",
                "description": "Direct parent id. Null for root(s)."
              },
              "path": {
                "type": "array<string>",
                "description": "Ancestry from root to this node, inclusive. path[0] = root id; last = id.",
                "constraints": ["length = level"]
              },
              "values": {
                "type": "object<string, YearValue>",
                "description": "Map of fiscal year → metrics for this node. FY key is a string 'YYYY'.",
                "value_type": {
                  "YearValue": {
                    "type": "object",
                    "fields": {
                      "nominal": {
                        "type": "number",
                        "units": "units.values_nominal",
                        "description": "Primary metric for this hierarchy (nominal). Usually outlays for function trees; check ETL notes.",
                        "synonyms": ["amount", "value"]
                      },
                      "budgetAuthority": {
                        "type": "number",
                        "units": "units.alt_budgetAuthority",
                        "description": "Optional alternate metric (e.g., Budget Authority) when supplied.",
                        "optional": true,
                        "synonyms": ["ba"]
                      }
                    }
                  }
                }
              },
              "meta": {
                "type": "object",
                "description": "Optional attributes for filters/labels (e.g., code, color, notes).",
                "optional": true
              }
            },
            "relationships": [
              "If complete, parent.values[fy].nominal ≈ sum(children.values[fy].nominal) (rounding/reclass may cause small gaps).",
              "level = path.length; parentId = path[level-2] when level > 1."
            ],
            "nullability_notes": [
              "values may be sparse by year; treat missing years as 0 for visualization only (never for exports).",
              "budgetAuthority is optional and only present for datasets that include BA."
            ],
            "validation_rules": [
              "id is unique across all nodes.",
              "When parentId != null, require parentId ∈ nodes[].id.",
              "path must start at a root (parentId=null) and end with id; no cycles.",
              "Year keys must match /^[0-9]{4}$/ and be within global coverage."
            ]
          }
        }
      }
    },
    "time_and_scope": {
      "fiscal_years": "Matches source coverage (e.g., 1962–2029). FY as 'YYYY' string keys.",
      "sources": {
        "OMB": "Functional/subfunctional spend; ETL may choose outlays as primary metric.",
        "Notes": "If an alternate BA series exists, it will populate values.budgetAuthority."
      },
      "price_basis": "Nominal dollars only (no inflation adjustment)."
    },
    "frontend_usage_hints": {
      "aggregation": [
        "Compute displayed totals by summing children for a selected FY when parent is missing that FY.",
        "Prefer true stored parent values over recomputed sums when both exist."
      ],
      "formatting": [
        "Scale using declared units: USD_thousands → billions = value/1e6; trillions = value/1e9.",
        "Gracefully handle sparse years (fade/zero-height bars rather than dropping nodes)."
      ],
      "interaction": [
        "Derive breadcrumbs from path[].",
        "Cache children[] lookups by building an index: parentId → child ids."
      ],
      "performance": [
        "Preindex by id, parentId, level, and years to avoid O(n) scans during drill-down.",
        "Memoize per-FY sums for large trees."
      ]
    },
    "etl_notes": {
      "id_conventions": "Use stable namespace prefixes (e.g., 'func:', 'subfunc:', 'agency:', 'account:'). Keep codes zero-padded.",
      "de_dupe": "ids are authoritative; if duplicate names appear at the same level, keep both if ids differ.",
      "sparsity": "Do not backfill missing years in ETL; leave absent.",
      "reconciliation": "Track any ETL reclassifications that break strict parent=sum(children) in a sidecar log."
    }
  }
}

Macro.json & MTS_Monthly.json
{
  "MTS_monthly.json": {
    "description": "Monthly Treasury Statement (MTS) fiscal-month receipts/outlays (and optional deficit).",
    "keys": {
      "units": {
        "type": "object",
        "fields": {
          "values": {
            "type": "enum: USD | USD_millions | USD_thousands",
            "description": "Unit for all numeric values in series.*"
          },
          "notes": {
            "type": "string",
            "optional": true
          }
        }
      },
      "series": {
        "type": "object",
        "description": "Named MTS series keyed by fiscal-month code.",
        "fields": {
          "receipts": {
            "type": "object<string, number>",
            "description": "Federal receipts by fiscal month.",
            "key_format": "FY{YYYY}M{MM} where MM=01..12 and M01=October.",
            "synonyms": ["revenue", "collections"]
          },
          "outlays": {
            "type": "object<string, number>",
            "description": "Federal outlays by fiscal month.",
            "key_format": "FY{YYYY}M{MM} where MM=01..12 and M01=October."
          },
          "deficit": {
            "type": "object<string, number>",
            "description": "Budget balance by fiscal month (outlays − receipts). Positive = deficit; negative = surplus.",
            "optional": true,
            "key_format": "FY{YYYY}M{MM}"
          }
        },
        "relationships": [
          "If `deficit` absent, compute on read: deficit[k] = outlays[k] − receipts[k] (when both present)."
        ],
        "validation_rules": [
          "All keys match /^FY[0-9]{4}M(0[1-9]|1[0-2])$/.",
          "Values must be finite numbers.",
          "If a key exists in both receipts and outlays, computed deficit must equal provided deficit within rounding tolerance."
        ]
      }
    },
    "time_and_scope": {
      "fiscal_months": "Fiscal year starts in October (M01=Oct ... M12=Sep).",
      "coverage": "As provided by ETL (e.g., FY2016M01–present).",
      "source": "U.S. Treasury MTS (monthly). Nominal dollars per units.values."
    },
    "frontend_usage_hints": {
      "formatting": [
        "Scale using units.values: if USD_millions, billions = value/1e3.",
        "Color-code deficit (red) vs surplus (green) on bar/area."
      ],
      "aggregation": [
        "FY total receipts/outlays: sum months M01..M12 within FY.",
        "YTD within FY: sum up to the latest available month."
      ],
      "alignment": [
        "For overlays with OMB FY totals, use FY sums; expect reconciliation differences due to definitions/timing."
      ],
      "tooltips": [
        "Show raw month key (e.g., 'FY2024M04') and calendar month name ('Jan'...'Dec') derived from fiscal mapping."
      ]
    },
    "etl_notes": {
      "sparsity": "Missing months should be omitted (do not insert 0).",
      "dedupe": "If duplicates for a month exist, keep the latest revision, log prior.",
      "consistency": "Ensure receipts/outlays series use identical key sets when available."
    }
  }
}



Sol_distribution.json and tax_policy.json

{
  "tax_policy.json": {
    "description": "Historical headline income tax policy parameters by calendar year (selected fields).",
    "keys": {
      "units": {
        "type": "object",
        "fields": {
          "currency": {
            "type": "enum: USD",
            "description": "Unit for threshold amounts."
          },
          "rates": {
            "type": "enum: decimal",
            "description": "Tax rates as decimals (0.37 = 37%)."
          }
        }
      },
      "history": {
        "type": "object<string, YearPolicy>",
        "description": "Map of year → policy snapshot (keys are 'YYYY').",
        "value_type": {
          "YearPolicy": {
            "type": "object",
            "fields": {
              "exemptions": {
                "type": "object",
                "description": "Personal exemptions by filing status (null if not applicable in that year).",
                "fields": {
                  "single": { "type": "number | null", "units": "units.currency" },
                  "marriedJoint": { "type": "number | null", "units": "units.currency" },
                  "dependents": { "type": "number | null", "units": "units.currency" }
                }
              },
              "lowestBracket": {
                "type": "object",
                "description": "Lowest marginal bracket rate and its upper threshold for Married Filing Jointly.",
                "fields": {
                  "rate": { "type": "number | null", "units": "units.rates" },
                  "thresholdMarriedJoint_under": {
                    "type": "number | null",
                    "units": "units.currency",
                    "description": "Upper bound of the lowest bracket for MFJ (taxable income)."
                  }
                }
              },
              "highestBracket": {
                "type": "object",
                "description": "Top marginal rate and its lower threshold for Married Filing Jointly.",
                "fields": {
                  "rate": { "type": "number | null", "units": "units.rates" },
                  "thresholdMarriedJoint_over": {
                    "type": "number | null",
                    "units": "units.currency",
                    "description": "Lower bound at which the top rate applies for MFJ (taxable income)."
                  }
                }
              }
            },
            "nullability_notes": [
              "Fields may be null for years where data is unavailable or policy element did not exist.",
              "If brackets differ by filing status and only MFJ is provided, UI should label accordingly."
            ],
            "validation_rules": [
              "If both lowestBracket.rate and highestBracket.rate are present, lowest ≤ highest.",
              "Thresholds, when present, must be >= 0."
            ]
          }
        },
        "key_format": "YYYY"
      }
    },
    "time_and_scope": {
      "coverage": "1913–present (as available). Calendar-year policy.",
      "basis": "Nominal USD; no inflation adjustment applied in this file."
    },
    "frontend_usage_hints": {
      "formatting": [
        "Display rates as percentages (e.g., 37%).",
        "Show thresholds with thousands separators and year context."
      ],
      "tooltips": [
        "`Exemptions` are per-person amounts where applicable.",
        "`Lowest/Highest Bracket` thresholds are MFJ taxable-income bounds."
      ]
    },
    "etl_notes": {
      "sparsity": "Leave fields null rather than fabricating values.",
      "consistency": "If a year has any bracket value, prefer to include both rate and threshold when known."
    }
  }
}

{
  "terms.json": {
    "description": "Presidential terms mapped to fiscal-year spans (inclusive), for coloring/aggregating budget data by administration.",
    "keys": {
      "items": {
        "type": "array<Term>",
        "value_type": {
          "Term": {
            "type": "object",
            "fields": {
              "president": {
                "type": "string",
                "description": "Full name as commonly styled.",
                "synonyms": ["name"]
              },
              "party": {
                "type": "enum: Republican | Democrat | Whig | Democratic-Republican | Federalist | National Union | None | Other",
                "description": "Party affiliation during the term segment represented."
              },
              "startFY": {
                "type": "integer",
                "description": "First fiscal year under this president (inclusive). FY runs Oct–Sep.",
                "constraints": [">= 1789"]
              },
              "endFY": {
                "type": "integer",
                "description": "Last fiscal year under this president (inclusive).",
                "constraints": [">= startFY"]
              }
            },
            "relationships": [
              "Fiscal-year alignment: A president inaugurated in Jan of calendar year Y typically first impacts FY Y (which began Oct of Y-1).",
              "Non-overlap rule: Term spans must not overlap in FY space."
            ],
            "validation_rules": [
              "Required: president, party, startFY, endFY.",
              "Ensure coverage continuity if desired views expect full coverage (allow gaps for early/edge cases)."
            ],
            "nullability_notes": [
              "No nulls expected in this dataset."
            ]
          }
        }
      }
    },
    "time_and_scope": {
      "coverage": "As provided; typically 1900–present.",
      "basis": "Fiscal years (FY)."
    },
    "frontend_usage_hints": {
      "alignment": [
        "When joining to yearly budget data keyed by FY (e.g., 1913), include rows where startFY ≤ FY ≤ endFY."
      ],
      "formatting": [
        "Use party to color bands; derive label `${president} (${startFY}–${endFY})`."
      ]
    },
    "etl_notes": {
      "dedupe": "If a president has non-contiguous spans (rare), keep separate entries.",
      "consistency": "Verify consecutive FYs have a single owning term (no overlaps)."
    }
  }
}

