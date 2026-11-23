/**
 * Full article bodies of the three launch blog posts, in CMS block form.
 *
 * Copied verbatim from the website's `lib/blogs.ts` (BLOG_POSTS), whose
 * article text is identical in every version from 2026-05-20 to 2026-11-23,
 * including the copy-reviewed commit 89b691e (2026-05-28). Generated, not
 * hand-typed: change the article in the CMS, not here.
 *
 * Why this exists: the original seeder loaded abbreviated bodies ("the full
 * text from lib/blogs.ts can be pasted in once…") and the site has shown
 * those since it went CMS-only (~2026-06-28). Used by
 *  - recover-blog-bodies.ts  (RECOVER_BLOG_BODIES=dry-run|apply, one-off), and
 *  - seed-content.ts         (so a fresh database gets the full articles).
 */
export const BLOG_BODIES: Record<string, any[]> = {
  "the-real-cost-of-free-migration": [
    {
      "__component": "blocks.lede",
      "content": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "The official position across most destination markets is unambiguous: workers should not pay to be recruited. The lived reality in 2026 is something else. New data from the ILO’s 2025 corridor study shows the average West African worker placed in Gulf hospitality or construction still pays the equivalent of 7–9 months of destination wages in upfront fees — before earning their first paycheck."
            }
          ]
        }
      ],
      "text": "The official position across most destination markets is unambiguous: workers should not pay to be recruited. The lived reality in 2026 is something else. New data from the ILO’s 2025 corridor study shows the average West African worker placed in Gulf hospitality or construction still pays the equivalent of 7–9 months of destination wages in upfront fees — before earning their first paycheck."
    },
    {
      "__component": "blocks.heading",
      "text": "The gap between policy and practice",
      "level": "h2"
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "Eighteen destination countries have now adopted some version of the “employer pays” principle in their published recruitment guidance. The IRIS standard, the UK’s Modern Slavery framework, and the Bali Process all converge on the same baseline: recruitment fees and related costs are an employer cost, not a worker cost."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "Yet enforcement remains fragmented. Workers are quoted “service charges” for documentation, “pre-departure orientation”, language assessments, accommodation deposits and a long tail of euphemisms that, taken together, easily exceed the equivalent of a year’s net earnings in the destination market."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.callout",
      "title": "What the 2025 ILO corridor study found",
      "content": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "Median fee burden along West Africa → Gulf hospitality corridors: $2,800–$4,200 per worker. Median fee burden along East Africa → GCC care corridors: $1,700–$2,400. Less than 11% of workers surveyed reported receiving an itemised invoice for the fees they paid."
            }
          ]
        }
      ],
      "text": "Median fee burden along West Africa → Gulf hospitality corridors: $2,800–$4,200 per worker. Median fee burden along East Africa → GCC care corridors: $1,700–$2,400. Less than 11% of workers surveyed reported receiving an itemised invoice for the fees they paid."
    },
    {
      "__component": "blocks.heading",
      "text": "Why “free migration” often isn’t",
      "level": "h2"
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "When pathway design pushes cost recovery onto the worker, three things happen, and all three undermine the long-term value the corridor is meant to create."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.list",
      "content": [
        {
          "type": "list",
          "format": "unordered",
          "children": [
            {
              "type": "list-item",
              "children": [
                {
                  "type": "text",
                  "text": "Workers arrive in debt, sometimes to family lenders charging effective rates of 40–120% APR. The first 6–12 months of earnings flow back to debt service, not to remittances or savings."
                }
              ]
            },
            {
              "type": "list-item",
              "children": [
                {
                  "type": "text",
                  "text": "Drop-out and absconding rates rise sharply in the first 90 days, because workers who feel trapped by debt make different employment decisions than workers who don’t."
                }
              ]
            },
            {
              "type": "list-item",
              "children": [
                {
                  "type": "text",
                  "text": "Employers pay more in the long run. The headline saving of a low-fee placement disappears as soon as you account for re-hiring, lost productivity and reputational risk from non-compliant subcontracted recruitment."
                }
              ]
            }
          ]
        }
      ],
      "items": [
        "Workers arrive in debt, sometimes to family lenders charging effective rates of 40–120% APR. The first 6–12 months of earnings flow back to debt service, not to remittances or savings.",
        "Drop-out and absconding rates rise sharply in the first 90 days, because workers who feel trapped by debt make different employment decisions than workers who don’t.",
        "Employers pay more in the long run. The headline saving of a low-fee placement disappears as soon as you account for re-hiring, lost productivity and reputational risk from non-compliant subcontracted recruitment."
      ],
      "ordered": false
    },
    {
      "__component": "blocks.heading",
      "text": "What changes when the model flips",
      "level": "h2"
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "When an employer formally takes on the recruitment cost — not as a discretionary bonus but as a contractual baseline — the entire economic logic of the pathway changes. The worker arrives un-indebted and is therefore free to make the choices that produce good outcomes for everyone: stay in the role, learn, send money home, plan a return."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.quote",
      "content": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "The first 90 days are where ethical recruitment is either real or imaginary. If a worker is in debt on day one, the model is broken, no matter what the brochure says."
            }
          ]
        }
      ],
      "text": "The first 90 days are where ethical recruitment is either real or imaginary. If a worker is in debt on day one, the model is broken, no matter what the brochure says.",
      "attribution": "Programme Lead, INSPIRE AFRICA"
    },
    {
      "__component": "blocks.heading",
      "text": "What INSPIRE does differently",
      "level": "h2"
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "The INSPIRE platform is built around a single non-negotiable: workers do not pay recruitment fees. Where structured migration finance is required to cover ancillary costs like visas, flights or initial accommodation, it is salary-linked, capped, transparent, and contracted separately — never bundled into an opaque “service charge”."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "That single design choice is what allows every other part of the pathway — readiness, matching, compliance, aftercare — to actually work. If the financial foundation is fair, the rest is engineering. If it isn’t, no amount of pre-departure training will fix the outcome."
            }
          ]
        }
      ]
    }
  ],
  "uk-care-visa-2026-what-african-workers-need-to-know": [
    {
      "__component": "blocks.lede",
      "content": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "The UK’s adult social-care vacancy rate sits above 8.3% as we go to publication — the equivalent of roughly 130,000 unfilled posts on any given day. The Spring 2026 amendments to the Health and Care Worker visa were sold as a way to professionalise the route. What they’ve actually done is narrow it."
            }
          ]
        }
      ],
      "text": "The UK’s adult social-care vacancy rate sits above 8.3% as we go to publication — the equivalent of roughly 130,000 unfilled posts on any given day. The Spring 2026 amendments to the Health and Care Worker visa were sold as a way to professionalise the route. What they’ve actually done is narrow it."
    },
    {
      "__component": "blocks.heading",
      "text": "What the 2026 changes actually do",
      "level": "h2"
    },
    {
      "__component": "blocks.list",
      "content": [
        {
          "type": "list",
          "format": "unordered",
          "children": [
            {
              "type": "list-item",
              "children": [
                {
                  "type": "text",
                  "text": "Raised the minimum hourly threshold for sponsorship in adult social care, bringing care workers closer to the general skilled-worker pay floor."
                }
              ]
            },
            {
              "type": "list-item",
              "children": [
                {
                  "type": "text",
                  "text": "Tightened sponsor licence conditions: care providers now face stricter scrutiny on accommodation arrangements, working-hours compliance and recruitment-fee declarations."
                }
              ]
            },
            {
              "type": "list-item",
              "children": [
                {
                  "type": "text",
                  "text": "Introduced a new requirement for sponsors to evidence local-recruitment efforts before issuing international Certificates of Sponsorship for entry-level care roles."
                }
              ]
            },
            {
              "type": "list-item",
              "children": [
                {
                  "type": "text",
                  "text": "Maintained the route’s exemption from the general work-visa salary increase — but only for genuine adult social-care roles, not for repackaged general care work."
                }
              ]
            }
          ]
        }
      ],
      "items": [
        "Raised the minimum hourly threshold for sponsorship in adult social care, bringing care workers closer to the general skilled-worker pay floor.",
        "Tightened sponsor licence conditions: care providers now face stricter scrutiny on accommodation arrangements, working-hours compliance and recruitment-fee declarations.",
        "Introduced a new requirement for sponsors to evidence local-recruitment efforts before issuing international Certificates of Sponsorship for entry-level care roles.",
        "Maintained the route’s exemption from the general work-visa salary increase — but only for genuine adult social-care roles, not for repackaged general care work."
      ],
      "ordered": false
    },
    {
      "__component": "blocks.heading",
      "text": "Why this matters for African workers",
      "level": "h2"
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "On paper, the route is still open. In practice, three things are filtering who actually gets through: documentary readiness, demonstrable English-language competence, and the credibility of the sponsoring employer. A candidate with a clean readiness profile from a structured pathway now clears these checks in days. A candidate sourced through an informal subagent often doesn’t clear them at all."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.callout",
      "title": "The under-reported story",
      "content": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "The 2026 changes are not pushing African workers out of the UK care sector. They are pushing out unstructured recruitment. Employers who could once tolerate hiring “whoever shows up” are now exposed to compliance penalties that make pre-screened, structured pipelines the only commercially rational choice."
            }
          ]
        }
      ],
      "text": "The 2026 changes are not pushing African workers out of the UK care sector. They are pushing out unstructured recruitment. Employers who could once tolerate hiring “whoever shows up” are now exposed to compliance penalties that make pre-screened, structured pipelines the only commercially rational choice."
    },
    {
      "__component": "blocks.heading",
      "text": "What employers are learning the hard way",
      "level": "h2"
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "Care groups that ran on a fragmented mix of agency hires, direct sponsorships and informal referrals are repricing their workforce strategy in 2026. The Home Office’s licence-revocation rate jumped sharply in Q1 — not because providers became less ethical overnight, but because the new compliance bar is harder to clear without a structured sourcing partner."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "The providers winning in this market are doing three things simultaneously: consolidating their sponsorship onto a smaller number of compliant recruitment partners; investing in pre-deployment readiness so the worker arrives able to perform from week one; and pricing aftercare into the contract, not bolting it on later."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.heading",
      "text": "What this looks like through the INSPIRE pipeline",
      "level": "h2"
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "Candidates entering the UK care corridor through INSPIRE complete a multi-stage readiness assessment that mirrors what UK sponsors and the Home Office actually scrutinise: language proficiency to the required standard, documentation that maps to the current Certificate of Sponsorship format, sector-specific competency evidence, and a clear, traceable recruitment chain with no informal subcontracting."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "The result for the sponsor is a candidate who can be onboarded in days. The result for the worker is a route that holds up under scrutiny at every step — visa interview, port-of-entry, first-90-days probation — and produces a placement that actually lasts."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.quote",
      "content": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "The market is finally rewarding what we’ve been building for years: structured pathways that hold up under inspection. The visa changes didn’t create that need. They just made it impossible to ignore."
            }
          ]
        }
      ],
      "text": "The market is finally rewarding what we’ve been building for years: structured pathways that hold up under inspection. The visa changes didn’t create that need. They just made it impossible to ignore.",
      "attribution": "Senior Adviser, INSPIRE AFRICA"
    }
  ],
  "from-remittance-to-reinvestment-earn-learn-return": [
    {
      "__component": "blocks.lede",
      "content": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "Remittances to Sub-Saharan Africa crossed $100 billion in 2025 — a number larger than total foreign direct investment and more than three times the value of official development assistance to the region. And yet, in most national budgets, this capital flow is treated as a footnote rather than a strategy."
            }
          ]
        }
      ],
      "text": "Remittances to Sub-Saharan Africa crossed $100 billion in 2025 — a number larger than total foreign direct investment and more than three times the value of official development assistance to the region. And yet, in most national budgets, this capital flow is treated as a footnote rather than a strategy."
    },
    {
      "__component": "blocks.heading",
      "text": "The household ceiling on remittance value",
      "level": "h2"
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "Remittances are by design household-level transfers. They fund school fees, medical bills, food security, modest home improvements. They are how families absorb shocks that the formal social-protection system doesn’t reach. They are not, in most cases, channelled into productive investment, skills accumulation or enterprise formation."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "That is not a moral failing of migrant families. It is a structural feature of unmanaged migration. When workers leave through informal channels, return without a plan, and reintegrate without support, the economic ceiling on what migration can do for the home economy is fundamentally capped."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.heading",
      "text": "What Earn-Learn-Return actually means",
      "level": "h2"
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "Earn-Learn-Return is shorthand for an explicit, designed migration cycle in which each of the three stages produces a measurable outcome for the worker and for the country of origin:"
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.list",
      "content": [
        {
          "type": "list",
          "format": "ordered",
          "children": [
            {
              "type": "list-item",
              "children": [
                {
                  "type": "text",
                  "text": "Earn — the worker accesses a higher-wage international labour market through a fair, structured pathway and, critically, captures more of that wage than they would under a fee-charging model."
                }
              ]
            },
            {
              "type": "list-item",
              "children": [
                {
                  "type": "text",
                  "text": "Learn — the placement is treated as a skills-development stage, not just a transactional job, with formal recognition of capability acquired (sector qualifications, language, supervisory experience)."
                }
              ]
            },
            {
              "type": "list-item",
              "children": [
                {
                  "type": "text",
                  "text": "Return — the return is anticipated, supported and connected to a reintegration pathway: small-business credit, employer matching, public-sector re-entry, or onward placement."
                }
              ]
            }
          ]
        }
      ],
      "items": [
        "Earn — the worker accesses a higher-wage international labour market through a fair, structured pathway and, critically, captures more of that wage than they would under a fee-charging model.",
        "Learn — the placement is treated as a skills-development stage, not just a transactional job, with formal recognition of capability acquired (sector qualifications, language, supervisory experience).",
        "Return — the return is anticipated, supported and connected to a reintegration pathway: small-business credit, employer matching, public-sector re-entry, or onward placement."
      ],
      "ordered": true
    },
    {
      "__component": "blocks.callout",
      "title": "The numbers governments tend to miss",
      "content": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "Pilot Earn-Learn-Return cohorts tracked across two East African corridors over 2023–2025 produced a 2.1× multiplier on per-worker reinvestment versus matched control groups of unstructured migrants. The difference wasn’t in how much was earned abroad — it was in how much returned as productive capital instead of consumption-only remittances."
            }
          ]
        }
      ],
      "text": "Pilot Earn-Learn-Return cohorts tracked across two East African corridors over 2023–2025 produced a 2.1× multiplier on per-worker reinvestment versus matched control groups of unstructured migrants. The difference wasn’t in how much was earned abroad — it was in how much returned as productive capital instead of consumption-only remittances."
    },
    {
      "__component": "blocks.heading",
      "text": "Why governments are starting to pay attention",
      "level": "h2"
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "Three trends are converging in 2026 that make this more than a policy think-piece. First, destination countries are tightening the rules on informal recruitment, which means governments of origin can no longer pretend that unmanaged migration is a costless externality. Second, the demographic case for managed African mobility is now mainstream in destination capitals — the conversation has shifted from “whether” to “how”. Third, the data infrastructure to actually track outcomes — not just departures and arrivals — has matured enough that bilateral agreements can be designed against measurable targets."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.quote",
      "content": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "If a country knows precisely how many of its workers are abroad, in what sectors, on what terms, and what they’re bringing back, it can make migration part of national development planning. If it doesn’t, it can’t."
            }
          ]
        }
      ],
      "text": "If a country knows precisely how many of its workers are abroad, in what sectors, on what terms, and what they’re bringing back, it can make migration part of national development planning. If it doesn’t, it can’t.",
      "attribution": "Partner government adviser"
    },
    {
      "__component": "blocks.heading",
      "text": "What this looks like in the INSPIRE model",
      "level": "h2"
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "INSPIRE AFRICA is built as the infrastructure for governed circular migration: corridor design with destination employers, worker readiness and protection, ethical financing where needed, and — the part most platforms quietly skip — return and reintegration as a first-class stage of the journey, not an afterthought."
            }
          ]
        }
      ]
    },
    {
      "__component": "blocks.paragraph",
      "text": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "text": "The argument for governments is straightforward: every cohort that moves through a governed pathway returns more value to the origin economy than the same cohort moving informally. The case for workers is also straightforward: a designed return is the difference between a placement that pays off for a decade and one that pays off for a year."
            }
          ]
        }
      ]
    }
  ]
};
