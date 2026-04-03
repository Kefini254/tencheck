# TenCheck — UML Diagrams

---

## 1. Class Diagram

The class diagram shows the primary domain entities, their attributes, and relationships.

```mermaid
classDiagram
    class Profile {
        +UUID id
        +UUID userId
        +String name
        +String email
        +String phone
        +String role
        +String avatarUrl
        +Boolean isSuspended
    }

    class Tenant {
        +UUID id
        +UUID userId
        +String nationalId
        +String fullName
        +String phone
        +Boolean identityVerified
        +Date dateOfBirth
    }

    class Landlord {
        +UUID id
        +UUID userId
        +Boolean isVerified
    }

    class LandlordVerification {
        +UUID landlordId
        +String documentType
        +String documentUrl
        +String verificationStatus
    }

    class Property {
        +UUID id
        +UUID landlordId
        +String title
        +String location
        +Int bedrooms
        +Int bathrooms
        +Decimal rentAmount
        +Boolean isAvailable
        +String[] images
    }

    class TenancyRecord {
        +UUID id
        +UUID tenantId
        +UUID landlordId
        +UUID propertyId
        +Date leaseStartDate
        +Date leaseEndDate
        +String status
    }

    class RentTransaction {
        +UUID id
        +UUID tenantId
        +UUID landlordId
        +Decimal amount
        +String paymentMethod
        +String mpesaCode
        +String verificationStatus
        +DateTime createdAt
    }

    class PaymentEvidence {
        +UUID id
        +UUID tenantId
        +UUID transactionId
        +String evidenceType
        +String evidenceUrl
        +String status
    }

    class TenantCreditPassport {
        +UUID tenantId
        +Int creditScore
        +String confidenceLevel
        +Int verifiedPayments
        +Int latePayments
        +Int missedPayments
        +DateTime updatedAt
        +calculate() Int
    }

    class TenantRisk {
        +UUID tenantId
        +Decimal riskScore
        +Int disputesCount
        +Int latePaymentsCount
        +Int missedPaymentsCount
        +DateTime updatedAt
        +calculate() Decimal
    }

    class TenantWallet {
        +UUID tenantId
        +Decimal balance
        +DateTime updatedAt
        +deposit(amount) void
        +deduct(amount) void
    }

    class ServiceWorker {
        +UUID id
        +UUID userId
        +String category
        +Boolean isVerified
        +Decimal rating
    }

    class ServiceRequest {
        +UUID id
        +UUID tenantId
        +UUID workerId
        +String category
        +String location
        +String status
        +Decimal depositAmount
        +DateTime createdAt
    }

    class Thread {
        +UUID id
        +UUID tenantId
        +UUID landlordId
        +UUID serviceWorkerId
        +UUID propertyId
        +DateTime createdAt
    }

    class Message {
        +UUID id
        +UUID threadId
        +UUID senderId
        +String content
        +Boolean isRead
        +DateTime createdAt
    }

    class Dispute {
        +UUID id
        +UUID raisedBy
        +UUID against
        +String disputeType
        +String status
        +String evidenceUrl
        +DateTime createdAt
    }

    class Inquiry {
        +UUID id
        +UUID tenantId
        +UUID propertyId
        +String message
        +String status
        +DateTime createdAt
    }

    class TrustNetwork {
        +UUID fromUserId
        +UUID toUserId
        +Decimal weight
        +String relationType
    }

    %% ── Inheritance / association ───────────────────────────────────────
    Profile "1" --> "0..1" Tenant         : has
    Profile "1" --> "0..1" Landlord       : has
    Profile "1" --> "0..1" ServiceWorker  : has

    Landlord "1" --> "0..1" LandlordVerification : verified by
    Landlord "1" --> "*"    Property             : owns

    Property "1"       --> "*" TenancyRecord : tracked by
    Property "1"       --> "*" Inquiry       : receives
    Tenant   "1"       --> "*" TenancyRecord : has
    Tenant   "1"       --> "*" RentTransaction : makes
    Tenant   "1"       --> "1" TenantCreditPassport : has
    Tenant   "1"       --> "1" TenantRisk    : assessed by
    Tenant   "1"       --> "1" TenantWallet  : owns
    Tenant   "1"       --> "*" Inquiry       : submits
    Tenant   "1"       --> "*" Dispute       : raises

    RentTransaction "1" --> "*" PaymentEvidence : supported by

    ServiceWorker "1" --> "*" ServiceRequest : fulfils
    Tenant        "1" --> "*" ServiceRequest : creates

    Thread "1" --> "*" Message : contains
```

---

## 2. Sequence Diagrams

### 2.1 User Registration & Sign-In

```mermaid
sequenceDiagram
    actor U as User (Browser)
    participant FE as React Frontend
    participant SA as Supabase Auth
    participant DB as PostgreSQL

    U->>FE: Fill sign-up form (name, email, password, phone, role)
    FE->>SA: supabase.auth.signUp({ email, password, options: { data: { name, phone, role } } })
    SA-->>DB: INSERT INTO auth.users
    DB-->>DB: TRIGGER handle_new_user()<br/>→ INSERT INTO profiles (userId, name, phone, role)
    SA-->>FE: { session, user }
    FE->>DB: SELECT * FROM profiles WHERE user_id = $1
    DB-->>FE: Profile row
    FE-->>U: Redirect to /dashboard

    Note over U,DB: Subsequent sign-in
    U->>FE: Enter email + password
    FE->>SA: supabase.auth.signInWithPassword({ email, password })
    SA-->>FE: { session: { access_token, refresh_token } }
    FE->>FE: Persist session in localStorage
    FE->>DB: SELECT * FROM profiles WHERE user_id = $1
    DB-->>FE: Profile row
    FE-->>U: Redirect to /dashboard
```

---

### 2.2 Landlord Screens a Tenant

```mermaid
sequenceDiagram
    actor L as Landlord
    participant FE as Dashboard (React)
    participant DB as PostgreSQL (Supabase)

    L->>FE: Open "Search Tenant" tab
    L->>FE: Enter national_id or phone
    FE->>DB: SELECT * FROM tenants WHERE national_id = $1 OR phone = $2
    DB-->>FE: Tenant record

    FE->>DB: SELECT * FROM tenant_credit_passport WHERE tenant_id = $1
    DB-->>FE: Credit passport (score, confidence)

    FE->>DB: SELECT * FROM tenant_risk WHERE tenant_id = $1
    DB-->>FE: Risk assessment (risk_score, disputes, late, missed)

    FE->>DB: SELECT * FROM rent_transactions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 12
    DB-->>FE: Payment history

    FE-->>L: Show TenantProfile panel:<br/>score, risk, payment timeline, badges
```

---

### 2.3 Tenant Records an M-Pesa Rent Payment

```mermaid
sequenceDiagram
    actor T as Tenant
    participant FE as Dashboard (React)
    participant DB as PostgreSQL
    participant ST as Supabase Storage
    participant MP as M-Pesa API

    T->>FE: Open "Pay Rent" tab
    T->>FE: Enter amount, M-Pesa code, landlord
    FE->>DB: INSERT INTO rent_transactions (tenant_id, landlord_id, amount, mpesa_code, verification_status='pending')
    DB-->>FE: { transaction_id }

    T->>FE: Upload M-Pesa SMS screenshot
    FE->>ST: upload to payment-evidence bucket
    ST-->>FE: { evidenceUrl }
    FE->>DB: INSERT INTO payment_evidence (tenant_id, transaction_id, evidence_url, status='pending')

    FE->>MP: POST /verify { mpesa_code }
    MP-->>FE: { verified: true, amount, timestamp }

    FE->>DB: UPDATE rent_transactions SET verification_status='verified' WHERE id = $1
    FE->>DB: SELECT calculate_credit_passport(tenant_id)
    DB-->>DB: Recalculate credit score & upsert tenant_credit_passport
    DB-->>FE: Updated passport

    FE-->>T: Show receipt + updated credit score
```

---

### 2.4 Tenant Books a Service Worker

```mermaid
sequenceDiagram
    actor T as Tenant
    actor W as Service Worker
    participant FE as Dashboard (React)
    participant DB as PostgreSQL
    participant RT as Supabase Realtime

    T->>FE: Open "Services" tab
    T->>FE: Select category (e.g. Plumbing), enter location + description
    FE->>DB: INSERT INTO service_requests (tenant_id, category, location, status='pending')
    DB-->>FE: { request_id }

    DB->>RT: Broadcast INSERT event on service_requests
    RT-->>W: Push notification: "New job available"

    W->>FE: Open worker dashboard, view request
    W->>FE: Accept job
    FE->>DB: UPDATE service_requests SET worker_id = $1, status='in_progress' WHERE id = $2
    DB-->>FE: OK

    DB->>RT: Broadcast UPDATE event
    RT-->>T: Push notification: "Worker accepted your request"

    W->>FE: Mark job complete
    FE->>DB: UPDATE service_requests SET status='completed' WHERE id = $1
    DB->>RT: Broadcast UPDATE event
    RT-->>T: Push notification: "Job completed"

    T->>FE: Submit review + rating for worker
    FE->>DB: INSERT INTO worker_reviews (reviewer_id, worker_id, rating, comment)
    DB-->>FE: Review saved
```

---

### 2.5 Dispute Filing & Resolution

```mermaid
sequenceDiagram
    actor T as Tenant
    actor L as Landlord
    actor A as Admin
    participant FE as Dashboard (React)
    participant DB as PostgreSQL

    T->>FE: Open "My Disputes" tab
    T->>FE: File dispute (type, description, evidence URL)
    FE->>DB: INSERT INTO disputes (raised_by, against, dispute_type, status='open', evidence_url)
    DB-->>FE: { dispute_id }
    FE-->>T: Dispute submitted

    FE->>DB: INSERT INTO notifications (user_id=landlord_id, type='dispute', body='New dispute filed')
    DB-->>L: Real-time notification

    L->>FE: Open dispute, add response
    FE->>DB: UPDATE disputes SET landlord_response = $1 WHERE id = $2
    DB-->>FE: OK

    A->>FE: Review dispute in Admin Dashboard
    A->>FE: Mark resolution (resolved / escalated)
    FE->>DB: UPDATE disputes SET status='resolved', resolution_notes = $1 WHERE id = $2
    FE->>DB: INSERT INTO moderation_log (admin_id, action='resolve_dispute', target_id=dispute_id)

    DB-->>T: Notification: dispute resolved
    DB-->>L: Notification: dispute resolved
```

---

## 3. Activity Diagrams

### 3.1 User Sign-Up Flow

```mermaid
flowchart TD
    Start([Start])
    A[Open /signup]
    B[Enter name, email, password,\nphone, role]
    C{Password\nstrength OK?}
    D[Show password strength indicator]
    E[Submit form]
    F[supabase.auth.signUp]
    G{Sign-up\nsucceeded?}
    H[Show error toast]
    I[DB trigger creates profile record]
    J[Fetch profile from DB]
    K{Role?}
    L[Redirect to /dashboard\nas Tenant]
    M[Redirect to /dashboard\nas Landlord]
    N[Redirect to /worker-dashboard\nas Service Worker]
    End([End])

    Start --> A --> B --> C
    C -- No --> D --> B
    C -- Yes --> E --> F --> G
    G -- No --> H --> B
    G -- Yes --> I --> J --> K
    K -- Tenant --> L --> End
    K -- Landlord --> M --> End
    K -- Service Worker --> N --> End
```

---

### 3.2 Credit Score Calculation Activity

```mermaid
flowchart TD
    Start([Start: calculate_credit_passport called])
    A[Fetch all rent_transactions for tenant]
    B[Count verified_payments]
    C[Count late_payments]
    D[Count missed_payments]
    E[Fetch open disputes count]
    F[Compute base_score =\nverified / total × 60]
    G[Compute penalty =\nlate×5 + missed×15 + disputes×10]
    H[credit_score = CLAMP\nbase_score - penalty + 40, 0-100]
    I{total_payments?}
    J[confidence = HIGH]
    K[confidence = MEDIUM]
    L[confidence = LOW]
    M[UPSERT tenant_credit_passport\ncredit_score, confidence_level,\nverified/late/missed counts]
    N([End: passport record updated])

    Start --> A
    A --> B & C & D & E
    B --> F
    C --> G
    D --> G
    E --> G
    F --> H
    G --> H
    H --> I
    I -- ≥ 12 months --> J --> M
    I -- 4–11 months --> K --> M
    I -- < 4 months --> L --> M
    M --> N
```

---

## 4. Component Diagram

Shows how the main frontend modules depend on each other and on Supabase backend services.

```mermaid
graph TB
    subgraph "Browser — React SPA"
        APP["App.tsx\n(Router + Providers)"]
        AUTH["AuthContext\n(session, profile, role)"]
        PAGES["Pages\n(Index, Login, Dashboard,\nProperties, Services, …)"]
        DASH["Dashboard.tsx\n(Role-based tab router)"]
        PANELS["Dashboard Panels\n(CreditPassportCard, RentPaymentPanel,\nAIMatchPanel, MessagingHub, …)"]
        LANDING["Landing Components\n(Navbar, Hero, Features,\nHowItWorks, Footer)"]
        UI["shadcn/ui Components\n(Button, Card, Dialog, Input, …)"]
        QUERY["TanStack React Query\n(cache + mutations)"]
        SUPA_CLIENT["supabase/client.ts\n(Typed Supabase JS client)"]
    end

    subgraph "Supabase Platform"
        AUTH_API["Auth API\n(JWT, email/password)"]
        POSTGREST["PostgREST\n(REST API over PostgreSQL)"]
        REALTIME["Realtime\n(WebSocket channels)"]
        STORAGE["Storage\n(payment-evidence,\navatars, property-images)"]
        DB[("PostgreSQL\n30+ tables\nRLS policies\nStored functions")]
    end

    APP --> AUTH
    APP --> PAGES
    PAGES --> DASH
    PAGES --> LANDING
    DASH --> PANELS
    PANELS --> UI
    PANELS --> QUERY
    LANDING --> UI
    AUTH --> SUPA_CLIENT
    QUERY --> SUPA_CLIENT

    SUPA_CLIENT --> AUTH_API
    SUPA_CLIENT --> POSTGREST
    SUPA_CLIENT --> REALTIME
    SUPA_CLIENT --> STORAGE

    AUTH_API --> DB
    POSTGREST --> DB
    REALTIME --> DB
```

---

## 5. Deployment Diagram

```mermaid
graph TB
    subgraph "End User Device"
        Browser["Web Browser\n(Chrome / Safari / Firefox)"]
    end

    subgraph "CDN / Hosting"
        Vite["Vite Production Build\n(static HTML + JS + CSS)"]
    end

    subgraph "Supabase Cloud (us-east-1)"
        SupaAuth["Supabase Auth Service\n(JWT issuance, session mgmt)"]
        SupaAPI["Supabase PostgREST\n(auto-generated REST API)"]
        SupaRT["Supabase Realtime\n(WebSocket / broadcast)"]
        SupaST["Supabase Storage\n(S3-compatible object store)"]
        Postgres["PostgreSQL 15\n(primary database)"]
    end

    Browser -->|"HTTPS — loads app"| Vite
    Browser -->|"HTTPS REST"| SupaAPI
    Browser -->|"HTTPS — auth"| SupaAuth
    Browser -->|"WSS — live updates"| SupaRT
    Browser -->|"HTTPS — file upload/download"| SupaST

    SupaAuth -->|"reads/writes"| Postgres
    SupaAPI  -->|"reads/writes via RLS"| Postgres
    SupaRT   -->|"listens to WAL"| Postgres
    SupaST   -->|"metadata"| Postgres
```
