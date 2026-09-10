# Lifecycle and attribution judgments

Use the relevant sections only. These are measurement semantics and sanity checks, not a prescribed funnel, statistical implementation or collection authority.

## Eligibility, availability and exposure

Define eligibility independently of successful use. Technical deployment, commercial entitlement, configuration, discoverability, actual exposure, attempt and useful completion answer different questions. In a feature launch, existing account signup is usually not the entry event for adoption. Account-level eligibility and person-level usage may need a justified aggregation rule; do not multiply employees into buying accounts or infer that an enabled admin exposes every teammate.

Keep counts at the same cutoff/window, and retain changes to eligibility. For a rate among enabled accounts, include every eligible enabled account at risk for the specified opportunity, not only those producing an event. For a rate among all eligible accounts, do not silently remove those unreached by the campaign. The former diagnoses downstream adoption; the latter includes reach/access limitations. Neither is a universal winner.

For migration, define attempted transition, successful transition, continuity of existing work, exclusion/deferral, fallback and ongoing old-path use. A changed entitlement can create accidental loss even while adoption of the new path rises. Track that consequence rather than treating every retained old-path user as an adoption failure. Some users cannot or should not migrate under current conditions.

## Ordered journeys and asynchronous handoffs

Define the required sequence and window, not just independent totals that happen to decrease. Distinguish request submitted, accepted, confirmed, fulfilled, cancelled, failed and unknown. Provider timeout does not establish failure or delivery. Duplicate callbacks should not create additional customers, bookings or revenue.

For a partner/marketplace path, preserve referral identity, matching/acceptance, user confirmation and completed service. Supply capacity and local geography/time availability can constrain fulfillment even when aggregate signup demand is high. Referral attribution and payout eligibility may occur at different states. Specify reconciliation to completed jobs or supplied commercial terms; do not invent accounting or partner policy.

Assign observations to the party/system that can actually establish them. Our outbound send log can prove submission, not receipt or comprehension. A partner's lead count cannot by itself establish our customer activation. Record the owner of the missing boundary evidence and the affected interpretation rather than leaving unaccepted work invisible.

## Observation opportunity and sustained value

Choose the return/value event and follow-up horizon that fit the job. Infrequent successful use may be healthy; habitual daily use is not a universal objective. Compare cohorts at equal maturity or state why they are not comparable. Customers who have not reached a renewal opportunity cannot be counted as renewed or churned for that horizon.

Separate assisted completion, incentives and exceptional rescue from normal delivery. Retain assistance per outcome/account, eligibility for help, and whether the customer could repeat the behavior independently. An assisted pilot can establish useful learning without proving unassisted conversion, scale economics or sustained retention. The measurement plan should bind those conditions so later reports cannot silently erase them.

## Attribution is not just a source field

Name platform-attributed, first/last-touch, multi-touch and incremental measures accurately. Several channels may claim the same customer. Use a permitted deduplicated identity and defined attribution window to reconcile totals; if overlap is unknown, do not sum the dashboards into a unique-customer claim. Allocating credit by convention is not estimating causal lift.

Timing changes, seasonality, acquisition mix, eligibility, price, product versions and observation lag can affect a before/after comparison. Preserve these as validity limits or candidates for an appropriate study. Do not subtract an arbitrary control trend and call the answer causal. Measurement can support descriptive progress without proving attribution; do not reject every observable improvement merely because a causal claim is unsupported.

## Economic and service quantities

Use the supplied definitions for bookings, recognized revenue, cash collected, credits/refunds, recurring value and costs. They differ by event and period; aggregate campaign reports cannot choose the company's recognition policy. If that policy is unavailable, keep the quantities separately labeled and request owner reconciliation.

Acquisition cost needs a compatible cost scope, window and acquired-customer definition. Include the specified sales/partner effort rather than quietly using media spend alone. Lifetime value requires credible horizon, margin and retention assumptions; do not derive it from an arbitrary multiple or a short pilot. Here specify the inputs and interpretation boundaries; commercial financial modeling and observed outcome assessment are separate tasks.

Time saved may represent capacity rather than cash savings. Do not add reduced support hours and the same underlying avoided labor bill as independent benefits. Failed delivery, retries, refunds and manual rescue can change both net value and who experienced it. Make the required states observable rather than assuming gross transactions equal benefit.

## Worked judgment: an adoption definition

Fictional approved sample: 240 accounts meet a documented eligibility rule at the cutoff; 80 were enabled for the full opportunity window; 24 of those completed their first reconciled export. The event table contains 29 completion events, including five retries. There is no measurement of first exposure to the announcement. All quantities refer to the same product version.

Useful proposed measures are 24/240 = 10% first-value completion among eligible accounts and 24/80 = 30% among enabled accounts, with the 240 and 80 counts retained. Compute these with an available permitted local tool before claiming independent verification. The 29 events are not 29 activated accounts. No announcement-to-activation rate is established without the exposure denominator, and the rates alone do not explain whether missing enablement reflects rollout policy, awareness or lack of fit.

If a definition correction changes eligibility, recompute the eligible-population rate only after checking the numerator is still contained in the corrected population. Do not keep all 24 successes while changing to a denominator whose membership is unknown. A later tracking event cannot reconstruct earlier announcement exposure. A sound next request is a scoped eligibility/enablement membership reconciliation and a separate prospective exposure definition, not an automatic new dashboard or retrospective launch-success claim.

## Measurement failure is itself a state

Specify what happens to interpretation when a dependency is down, events arrive twice or out of order, malicious/bot activity contaminates counts, or volume increases beyond collection/processing capacity. Missing events, sampling, delayed settlement and truncation can all resemble changed customer behavior. A proposed 10x collection requirement is not measured 10x capacity. Name the source-health counters/reconciliation and owner needed to distinguish these conditions; no live load test or instrumentation change is performed here.
