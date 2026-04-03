# TenCheck — Data Flow Diagrams (DFD)

DFDs use the Gane-Sarson notation adapted for Mermaid:

| Shape | Meaning |
|---|---|
| Rectangle `[ ]` | External entity (actor outside the system) |
| Stadium `([ ])` | Process (transforms data) |
| Cylinder `[( )]` | Data store (persistent storage) |
| Labelled arrow `-->` | Data flow (named data in motion) |

---

## Level 0 — Context Diagram

The context diagram treats TenCheck as a single black-box process and shows every external entity and the high-level data that flows in and out.

```mermaid
flowchart LR
    Tenant["Tenant"]
    Landlord["Landlord"]
    Worker["Service Worker"]
    Admin["Admin"]
    Mpesa["M-Pesa API"]

    TC(["TenCheck\nPlatform"])

    Tenant  -->|"Registration, payments,\nservice requests"| TC
    TC      -->|"Credit passport, listings,\nnotifications"| Tenant

    Landlord -->|"Properties, payment reports,\ntenant searches"| TC
    TC       -->|"Tenant scores, demand\ninsights, alerts"| Landlord

    Worker -->|"Worker profile,\njob status updates"| TC
    TC     -->|"Service jobs, reviews,\nendorsements"| Worker

    Admin -->|"Moderation actions,\nverifications, config"| TC
    TC    -->|"System alerts, user\nreports, audit logs"| Admin

    TC    -->|"Verification request"| Mpesa
    Mpesa -->|"Transaction confirmation"| TC
```

---

## Level 1 — Main Processes

Level 1 decomposes TenCheck into **8 core processes** and **7 data stores**, showing how each external entity interacts with the system and where data is persisted.

```mermaid
flowchart TB
    %% ── External entities ──────────────────────────────────────────────
    Tenant["Tenant"]
    Landlord["Landlord"]
    Worker["Service Worker"]
    Admin["Admin"]
    Mpesa["M-Pesa API"]

    %% ── Processes ───────────────────────────────────────────────────────
    P1(["1. User Auth\n& Profile Mgmt"])
    P2(["2. Property\nManagement"])
    P3(["3. Rent Payment\nProcessing"])
    P4(["4. Credit Scoring\nEngine"])
    P5(["5. Service\nMarketplace"])
    P6(["6. Messaging &\nNotifications"])
    P7(["7. Dispute\nResolution"])
    P8(["8. System\nAdministration"])

    %% ── Data stores ─────────────────────────────────────────────────────
    DS1[("DS1 · Profiles\n& Auth")]
    DS2[("DS2 · Properties\n& Tenancies")]
    DS3[("DS3 · Transactions\n& Evidence")]
    DS4[("DS4 · Scores\n& Passports")]
    DS5[("DS5 · Services\n& Workers")]
    DS6[("DS6 · Messages\n& Notifications")]
    DS7[("DS7 · Disputes\n& Audit Logs")]

    %% ── Entity → Process data flows ────────────────────────────────────
    Tenant   -->|"Sign-up / login"| P1
    Landlord -->|"Sign-up / login"| P1
    Worker   -->|"Sign-up / login"| P1

    Tenant   -->|"Browse, inquire"| P2
    Landlord -->|"List / manage properties"| P2

    Tenant   -->|"Payment details, M-Pesa code"| P3
    Landlord -->|"Report tenant payment"| P3
    Mpesa    -->|"Transaction confirmation"| P3

    Tenant   -->|"Request credit score"| P4
    Landlord -->|"Search tenant by ID/phone"| P4

    Tenant -->|"Create service request"| P5
    Worker -->|"Accept / update job"| P5

    Tenant   -->|"Send message"| P6
    Landlord -->|"Send message"| P6

    Tenant   -->|"File dispute"| P7
    Landlord -->|"Respond to dispute"| P7

    Admin -->|"Admin action / config"| P8

    %% ── Process → Entity data flows ────────────────────────────────────
    P1 -->|"Session token, profile"| Tenant
    P1 -->|"Session token, profile"| Landlord
    P1 -->|"Session token, profile"| Worker

    P2 -->|"Matching listings, inquiry status"| Tenant
    P2 -->|"Inquiry notification"| Landlord

    P3 -->|"Verify payment"| Mpesa
    P3 -->|"Receipt / wallet balance"| Tenant
    P3 -->|"Payment confirmed"| Landlord

    P4 -->|"Credit passport, risk score"| Tenant
    P4 -->|"Tenant risk report"| Landlord

    P5 -->|"Job details, status"| Worker
    P5 -->|"Worker matches, job status"| Tenant

    P6 -->|"Messages, notifications"| Tenant
    P6 -->|"Messages, notifications"| Landlord

    P7 -->|"Dispute outcome"| Tenant
    P7 -->|"Dispute outcome"| Landlord

    P8 -->|"Alerts, audit logs"| Admin

    %% ── Process ↔ Data store flows ──────────────────────────────────────
    P1 <-->|"read/write profiles"| DS1
    P2 <-->|"read/write listings"| DS2
    P3 <-->|"write transactions"| DS3
    P4 -->|"read transactions"| DS3
    P4 <-->|"read/write scores"| DS4
    P5 <-->|"read/write requests"| DS5
    P6 <-->|"read/write messages"| DS6
    P7 <-->|"read/write disputes"| DS7
    P8 <-->|"read/write all stores"| DS1
```

---

## Level 2 — Process Decomposition

### Level 2.1 — Process 3: Rent Payment Processing

```mermaid
flowchart TB
    Tenant["Tenant"]
    Landlord["Landlord"]
    Mpesa["M-Pesa API"]

    P31(["3.1 Record\nPayment Details"])
    P32(["3.2 Upload\nPayment Evidence"])
    P33(["3.3 Verify\nM-Pesa Code"])
    P34(["3.4 Process\nWallet Payment"])
    P35(["3.5 Update\nPayment Status"])

    DS3A[("Rent\nTransactions")]
    DS3B[("Payment\nEvidence")]
    DS4[("Scores &\nPassports")]
    DSW[("Tenant\nWallets")]

    Tenant   -->|"Amount, payment method, M-Pesa code"| P31
    Landlord -->|"Tenant ID, amount, date"| P31
    P31      -->|"New transaction record"| DS3A
    P31      -->|"Transaction ID → triggers"| P32

    Tenant -->|"SMS screenshot / document"| P32
    P32    -->|"Evidence file URL"| DS3B
    P32    -->|"Evidence submitted"| P33

    P33 -->|"M-Pesa code to verify"| Mpesa
    Mpesa -->|"Verification result"| P33
    P33   -->|"verified / failed status"| P35

    Tenant -->|"Wallet deduction request"| P34
    P34    -->|"Check balance"| DSW
    P34    -->|"Deducted balance"| DSW
    P34    -->|"Wallet payment confirmed"| P35

    P35 -->|"Update transaction status"| DS3A
    P35 -->|"Trigger score recalculation"| DS4
    P35 -->|"Receipt"| Tenant
    P35 -->|"Payment confirmed"| Landlord
```

---

### Level 2.2 — Process 4: Credit Scoring Engine

```mermaid
flowchart TB
    Tenant["Tenant"]
    Landlord["Landlord"]

    P41(["4.1 Aggregate\nPayment Data"])
    P42(["4.2 Calculate\nCredit Score"])
    P43(["4.3 Calculate\nRisk Score"])
    P44(["4.4 Generate\nCredit Passport"])
    P45(["4.5 Share\nPassport"])

    DS3[("Transactions\n& Evidence")]
    DS4A[("Credit\nPassports")]
    DS4B[("Risk\nAssessments")]
    DS7[("Disputes")]

    Tenant   -->|"Score request"| P41
    Landlord -->|"Tenant lookup"| P41

    P41 -->|"Fetch payment history"| DS3
    P41 -->|"Aggregated stats"| P42
    P41 -->|"Aggregated stats"| P43

    P42 -->|"Fetch dispute count"| DS7
    P42 -->|"credit_score, confidence_level"| DS4A
    P42 -->|"Score result"| P44

    P43 -->|"Fetch dispute count"| DS7
    P43 -->|"risk_score, breakdown"| DS4B
    P43 -->|"Risk result"| P44

    P44 -->|"Full passport record"| DS4A
    P44 -->|"Passport ready"| P45
    P44 -->|"Credit report"| Tenant
    P44 -->|"Risk report"| Landlord

    P45 -->|"Shareable URL"| Tenant
```

---

### Level 2.3 — Process 2: Property Management

```mermaid
flowchart TB
    Tenant["Tenant"]
    Landlord["Landlord"]

    P21(["2.1 List / Update\nProperty"])
    P22(["2.2 Search &\nFilter Properties"])
    P23(["2.3 Submit\nInquiry"])
    P24(["2.4 Create\nTenancy Record"])
    P25(["2.5 Track\nMarket Demand"])

    DS2A[("Properties")]
    DS2B[("Inquiries")]
    DS2C[("Tenancy\nRecords")]
    DS2D[("Property\nDemand")]

    Landlord -->|"Title, rent, location, images"| P21
    P21      -->|"Property record"| DS2A
    P21      -->|"Listing confirmed"| Landlord

    Tenant -->|"Filters, location, rent range"| P22
    P22    -->|"Query"| DS2A
    P22    -->|"Matching listings"| Tenant
    P22    -->|"Search event"| P25

    Tenant -->|"Message + property ID"| P23
    P23    -->|"Inquiry record"| DS2B
    P23    -->|"Notification"| Landlord

    Landlord -->|"Tenant ID, lease dates"| P24
    P24      -->|"Tenancy record"| DS2C
    P24      -->|"Tenancy confirmed"| Tenant

    P25 -->|"Update demand stats"| DS2D
    P25 -->|"Demand report"| Landlord
```

---

## Level 3 — Credit Score Calculation (Process 4.2 Detail)

Process 4.2 is the most critical computation in TenCheck. Level 3 exposes the step-by-step logic inside the `calculate_credit_passport` PostgreSQL stored function.

```mermaid
flowchart TD
    ENTRY(["ENTRY\nAggregated payment stats\nreceived from Process 4.1"])

    P421(["4.2.1 Fetch\nVerified Payments"])
    P422(["4.2.2 Fetch\nLate Payments"])
    P423(["4.2.3 Fetch\nMissed Payments"])
    P424(["4.2.4 Fetch\nActive Disputes"])

    P425(["4.2.5 Apply\nScoring Formula"])
    P426(["4.2.6 Determine\nConfidence Level"])
    P427(["4.2.7 Upsert\nCredit Passport"])

    EXIT(["EXIT\nCredit passport updated;\nnotify caller"])

    DS3[("Rent\nTransactions")]
    DS7[("Disputes")]
    DS4[("Credit\nPassports")]

    ENTRY --> P421
    ENTRY --> P422
    ENTRY --> P423
    ENTRY --> P424

    P421 -->|"COUNT verified rows"| DS3
    P422 -->|"COUNT late rows"| DS3
    P423 -->|"COUNT missed rows"| DS3
    P424 -->|"COUNT open disputes"| DS7

    P421 -->|"verified_count"| P425
    P422 -->|"late_count"| P425
    P423 -->|"missed_count"| P425
    P424 -->|"disputes_count"| P425

    P425 -->|"raw_score  0–100"| P426
    P425 -->|"score_components"| P427

    P426 -->|"high / medium / low"| P427

    P427 -->|"UPSERT record"| DS4
    P427 --> EXIT
```

### Scoring Formula (Process 4.2.5)

```
base_score   = (verified_count / max(total_payments, 1)) × 60
penalty      = (late_count × 5) + (missed_count × 15) + (disputes_count × 10)
credit_score = CLAMP(base_score - penalty + 40, 0, 100)

confidence_level:
  - HIGH   → total_payments ≥ 12
  - MEDIUM → total_payments ≥ 4
  - LOW    → total_payments < 4
```

---

## Summary: Process Inventory

| ID | Process | Key Inputs | Key Outputs |
|---|---|---|---|
| P1 | User Auth & Profile Mgmt | Credentials, user data | Session token, profile |
| P2 | Property Management | Listings, search queries, inquiries | Matched properties, tenancy records |
| P3 | Rent Payment Processing | Payment details, M-Pesa codes, evidence | Verified transactions, receipts |
| P4 | Credit Scoring Engine | Transaction history, disputes | Credit passport, risk score |
| P5 | Service Marketplace | Service requests, job updates | Job assignments, ratings |
| P6 | Messaging & Notifications | Messages, system events | Delivered messages, push notifications |
| P7 | Dispute Resolution | Dispute filings, evidence | Resolutions, outcomes |
| P8 | System Administration | Admin commands | Audit logs, moderation actions |
