# TenCheck — Use Case Diagrams

Use case diagrams are rendered as Mermaid flowcharts.  
Conventions used:

- **Actor** — rectangle `[ ]` on the left/right edge  
- **Use Case** — stadium shape `([ ])` inside the system boundary  
- **`---`** — actor participates in use case  
- **`-.->|«include»|`** — mandatory inclusion  
- **`-.->|«extend»|`** — optional extension  

---

## 1. System Overview Use Case Diagram

High-level view of all actors and the feature areas they interact with.

```mermaid
flowchart LR
    Tenant["👤 Tenant"]
    Landlord["👤 Landlord"]
    Worker["👤 Service Worker"]
    Admin["👤 Admin"]
    Mpesa["⚙️ M-Pesa API"]

    subgraph TenCheck ["TenCheck System"]
        UC_AUTH(["Manage Account\n& Authentication"])
        UC_PROP(["Browse & Manage\nProperties"])
        UC_PAY(["Process Rent\nPayments"])
        UC_SCORE(["Credit Scoring\n& Passport"])
        UC_SVC(["Service\nMarketplace"])
        UC_MSG(["Messaging &\nNotifications"])
        UC_DISP(["Dispute\nResolution"])
        UC_ADMIN(["System\nAdministration"])
    end

    Tenant   --- UC_AUTH
    Landlord --- UC_AUTH
    Worker   --- UC_AUTH

    Tenant   --- UC_PROP
    Landlord --- UC_PROP

    Tenant   --- UC_PAY
    Landlord --- UC_PAY
    Mpesa    --- UC_PAY

    Tenant   --- UC_SCORE
    Landlord --- UC_SCORE

    Tenant --- UC_SVC
    Worker --- UC_SVC

    Tenant   --- UC_MSG
    Landlord --- UC_MSG

    Tenant   --- UC_DISP
    Landlord --- UC_DISP
    Admin    --- UC_DISP

    Admin --- UC_ADMIN
```

---

## 2. Tenant Use Cases

```mermaid
flowchart LR
    T["👤 Tenant"]
    Mpesa["⚙️ M-Pesa API"]

    subgraph System ["TenCheck — Tenant Use Cases"]

        subgraph Auth ["Account Management"]
            UC1(["Register Account"])
            UC2(["Sign In / Sign Out"])
            UC3(["Reset Password"])
            UC4(["Update Profile"])
        end

        subgraph Properties ["Property & Tenancy"]
            UC5(["Browse Property Listings"])
            UC6(["Filter Properties\n(location, rent, bedrooms)"])
            UC7(["View Property Detail"])
            UC8(["Submit Property Inquiry"])
            UC9(["View My Tenancies"])
        end

        subgraph Payments ["Payments & Wallet"]
            UC10(["Record Rent Payment"])
            UC11(["Upload M-Pesa Evidence"])
            UC12(["Deposit to Wallet"])
            UC13(["Pay Rent via Wallet"])
            UC14(["Apply for Micro-Financing"])
        end

        subgraph Passport ["Credit Passport"]
            UC15(["View Credit Passport"])
            UC16(["View Risk Score"])
            UC17(["Share Passport Link"])
            UC18(["View Payment Timeline"])
        end

        subgraph Services ["Services"]
            UC19(["Create Service Request"])
            UC20(["Track Service Job Status"])
            UC21(["Rate Service Worker"])
            UC22(["Report Service Worker"])
            UC23(["Purchase Service Credits"])
        end

        subgraph Social ["Social & Comms"]
            UC24(["Send Message to Landlord"])
            UC25(["View Notifications"])
            UC26(["Connect in Trust Network"])
            UC27(["File Dispute"])
            UC28(["View AI Property Matches"])
        end

    end

    T --- UC1
    T --- UC2
    T --- UC3
    T --- UC4

    T --- UC5
    T --- UC6
    T --- UC7
    T --- UC8
    T --- UC9

    T --- UC10
    T --- UC11
    T --- UC12
    T --- UC13
    T --- UC14

    T --- UC15
    T --- UC16
    T --- UC17
    T --- UC18

    T --- UC19
    T --- UC20
    T --- UC21
    T --- UC22
    T --- UC23

    T --- UC24
    T --- UC25
    T --- UC26
    T --- UC27
    T --- UC28

    UC10 -.->|"«include»"| UC11
    UC13 -.->|"«include»"| UC12
    UC10 -.->|"«extend»"| Mpesa
    UC15 -.->|"«include»"| UC18
    UC17 -.->|"«include»"| UC15
```

---

## 3. Landlord Use Cases

```mermaid
flowchart LR
    L["👤 Landlord"]

    subgraph System ["TenCheck — Landlord Use Cases"]

        subgraph Auth ["Account Management"]
            UC1(["Register Account"])
            UC2(["Sign In / Sign Out"])
            UC3(["Submit Verification\nDocuments"])
            UC4(["Update Profile"])
        end

        subgraph PropertyMgmt ["Property Management"]
            UC5(["List New Property"])
            UC6(["Edit / Remove Property"])
            UC7(["View Property Inquiries"])
            UC8(["Respond to Inquiries"])
            UC9(["Create Tenancy Record"])
            UC10(["View Tenancy History"])
        end

        subgraph TenantMgmt ["Tenant Management"]
            UC11(["Search Tenant\n(by ID or phone)"])
            UC12(["View Tenant\nCredit Passport"])
            UC13(["View Tenant\nRisk Profile"])
            UC14(["AI Rank Applicants"])
            UC15(["Report Payment\non behalf of Tenant"])
        end

        subgraph Payments ["Payments & Analytics"]
            UC16(["View Payment History"])
            UC17(["View Market\nDemand Insights"])
        end

        subgraph Social ["Social & Comms"]
            UC18(["Send Message to Tenant"])
            UC19(["View Notifications"])
            UC20(["Build Trust Network"])
            UC21(["Manage Disputes"])
            UC22(["Endorse Service Worker"])
        end

    end

    L --- UC1
    L --- UC2
    L --- UC3
    L --- UC4

    L --- UC5
    L --- UC6
    L --- UC7
    L --- UC8
    L --- UC9
    L --- UC10

    L --- UC11
    L --- UC12
    L --- UC13
    L --- UC14
    L --- UC15

    L --- UC16
    L --- UC17

    L --- UC18
    L --- UC19
    L --- UC20
    L --- UC21
    L --- UC22

    UC11 -.->|"«include»"| UC12
    UC12 -.->|"«include»"| UC13
    UC14 -.->|"«include»"| UC12
```

---

## 4. Service Worker Use Cases

```mermaid
flowchart LR
    W["👤 Service Worker"]
    L["👤 Landlord"]

    subgraph System ["TenCheck — Service Worker Use Cases"]

        subgraph Auth ["Account Management"]
            UC1(["Register as\nService Worker"])
            UC2(["Sign In / Sign Out"])
            UC3(["Upload Verification\nDocuments"])
            UC4(["Set Availability\n& Skills"])
        end

        subgraph Jobs ["Job Management"]
            UC5(["View Available\nService Requests"])
            UC6(["Accept Service Request"])
            UC7(["Update Job Status\n(in_progress / completed)"])
            UC8(["View Job History"])
        end

        subgraph Reputation ["Reputation"]
            UC9(["View Reviews\n& Ratings"])
            UC10(["Receive Landlord\nEndorsement"])
            UC11(["View Worker\nProfile Score"])
        end

        subgraph Comms ["Communication"]
            UC12(["Message Tenant\nor Landlord"])
            UC13(["View Notifications"])
        end

    end

    W --- UC1
    W --- UC2
    W --- UC3
    W --- UC4

    W --- UC5
    W --- UC6
    W --- UC7
    W --- UC8

    W --- UC9
    W --- UC10
    W --- UC11

    W --- UC12
    W --- UC13

    L -.->|"«endorses»"| UC10

    UC6 -.->|"«include»"| UC5
    UC7 -.->|"«include»"| UC6
```

---

## 5. Admin Use Cases

```mermaid
flowchart LR
    A["👤 Admin"]

    subgraph System ["TenCheck — Admin Use Cases"]

        subgraph Users ["User Management"]
            UC1(["Search / View\nUser Profiles"])
            UC2(["Suspend / Unsuspend\nUser Account"])
            UC3(["Assign / Revoke\nAdmin Role"])
        end

        subgraph Verification ["Verification Workflows"]
            UC4(["Review Landlord\nVerification Documents"])
            UC5(["Approve / Reject\nLandlord Verification"])
            UC6(["Review Service Worker\nVerification"])
            UC7(["Approve / Reject\nWorker Verification"])
        end

        subgraph Moderation ["Content Moderation"]
            UC8(["Review Flagged\nContent"])
            UC9(["Resolve Disputes"])
            UC10(["View Worker\nComplaints"])
            UC11(["Remove Inappropriate\nListings"])
        end

        subgraph Monitoring ["System Monitoring"]
            UC12(["View Admin Alerts"])
            UC13(["View Moderation\nAudit Log"])
            UC14(["View Platform\nAnalytics"])
        end

    end

    A --- UC1
    A --- UC2
    A --- UC3

    A --- UC4
    A --- UC5
    A --- UC6
    A --- UC7

    A --- UC8
    A --- UC9
    A --- UC10
    A --- UC11

    A --- UC12
    A --- UC13
    A --- UC14

    UC5 -.->|"«include»"| UC4
    UC7 -.->|"«include»"| UC6
    UC9 -.->|"«include»"| UC8
    UC13 -.->|"«include»"| UC9
```

---

## 6. Cross-Actor Use Case: Dispute Resolution

Shows all actors involved in the full dispute lifecycle.

```mermaid
flowchart TD
    T["👤 Tenant"]
    L["👤 Landlord"]
    A["👤 Admin"]

    subgraph Dispute ["Dispute Resolution Flow"]
        UC1(["File Dispute\n(type, evidence, description)"])
        UC2(["Receive Dispute\nNotification"])
        UC3(["View Dispute\nDetails"])
        UC4(["Submit Landlord\nResponse"])
        UC5(["Review Dispute\n(Admin)"])
        UC6(["Resolve Dispute"])
        UC7(["Receive Resolution\nNotification"])
        UC8(["Log Moderation\nAction"])
    end

    T --- UC1
    L --- UC2
    L --- UC3
    L --- UC4
    A --- UC5
    A --- UC6
    T --- UC7
    L --- UC7
    A --- UC8

    UC1 -.->|"«triggers»"| UC2
    UC2 -.->|"«include»"| UC3
    UC3 -.->|"«extend»"| UC4
    UC4 -.->|"«triggers»"| UC5
    UC5 -.->|"«include»"| UC6
    UC6 -.->|"«triggers»"| UC7
    UC6 -.->|"«include»"| UC8
```

---

## 7. Cross-Actor Use Case: Rent Payment Verification

Shows the tenant, M-Pesa, and the system collaborating on payment verification.

```mermaid
flowchart TD
    T["👤 Tenant"]
    L["👤 Landlord"]
    MP["⚙️ M-Pesa API"]

    subgraph Payment ["Rent Payment Verification"]
        UC1(["Enter Payment\nDetails"])
        UC2(["Upload M-Pesa\nSMS Evidence"])
        UC3(["Verify M-Pesa\nTransaction Code"])
        UC4(["Store Verified\nTransaction"])
        UC5(["Recalculate\nCredit Score"])
        UC6(["Notify Landlord\nof Payment"])
        UC7(["View Updated\nCredit Passport"])
    end

    T  --- UC1
    T  --- UC2
    L  --- UC6
    MP --- UC3
    T  --- UC7

    UC1 -.->|"«include»"| UC2
    UC2 -.->|"«triggers»"| UC3
    UC3 -.->|"«include»"| UC4
    UC4 -.->|"«triggers»"| UC5
    UC4 -.->|"«triggers»"| UC6
    UC5 -.->|"«triggers»"| UC7
```

---

## Use Case Count Summary

| Actor | Total Use Cases |
|---|---|
| Tenant | 28 |
| Landlord | 22 |
| Service Worker | 13 |
| Admin | 14 |
| **Total unique** | **~50** |
