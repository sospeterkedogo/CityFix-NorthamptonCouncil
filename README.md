# City Fix: Municipal Infrastructure Resolution Platform

**Status:** Active Development | **Stack:** React Native, Firebase, Cloud Functions

**City Fix** is a secure, role-based mobile and web solution designed for Northampton Council to streamline the lifecycle of civic maintenance. It replaces fragmented reporting channels with a unified, geospatial workflow engine connecting Citizens, Dispatchers, Field Engineers, and Quality Auditors.

graph TD
    subgraph "Clients (React Native/Expo)"
        Cit[Citizen App]
        Disp[Dispatcher Web Console]
        Eng[Field Engineer App]
        QA[Quality Auditor App]
    end

    subgraph "Edge & Auth"
        Auth[Firebase Auth]
        CC[Custom Claims\n(Admin, Engineer, Auditor)]
    end

    subgraph "Backend (Firebase Serverless)"
        API[Cloud Functions\n(Triggers & REST)]
        Store[(Firestore DB\nNoSQL Documents)]
        Bucket[(Cloud Storage\nMedia Buckets)]
    end

    subgraph "External Services"
        Maps[Map Provider API]
        Notif[Push Notification Svc]
    end

    %% Auth Flows
    Cit -.->|Auth| Auth
    Disp -.->|Auth| Auth
    Eng -.->|Auth| Auth
    QA -.->|Auth| Auth
    Auth -->|Validates| CC

    %% Citizen Flow
    Cit -->|1. Post Draft/Issue| Store
    Cit -->|Upload Media| Bucket
    Bucket -->|Trigger| API
    API -->|Resize/Compress| Bucket

    %% Dispatcher Flow
    Disp -->|2. Deduplicate & Assign| Store
    Store -->|Geospatial Query| Maps

    %% Engineer Flow
    Store -->|3. Route Data| Eng
    Eng -->|Upload Proof (Gate)| Bucket
    Eng -->|Mark Resolved| Store

    %% QA Flow
    QA -->|4. Compare Media| Bucket
    QA -->|Verify/Reject| Store

    %% Notifications
    Store -.->|On Status Change| API
    API -.->|Send Alert| Notif
    Notif -.->|Update| Cit

## The Resolution Workflow

The core of City Fix is a strictly typed state machine that governs the lifecycle of every issue report. Transitions are guarded by server-side Role-Based Access Control (RBAC).

`Draft` → `Submitted` → `Under Review` → `Assigned` → `In Progress` → `Resolved` → `Verified` (or `Reopened`)

1.  **Ingestion:** Citizens report issues (e.g., Potholes, Flooding) with GPS pinning and multimedia evidence.
2.  **Triage:** Dispatchers utilize geospatial clustering to merge duplicate reports and assign priorities.
3.  **Execution:** Field Engineers receive optimized routes and must clear "Evidence Gates" (uploading proof) to resolve tickets.
4.  **Governance:** QA Auditors utilize side-by-side comparison tools to verify the fix before closing the loop.

---

## Key Features by Role

### Citizen (Reporting & Transparency)
* **Evidence-Based Reporting:** Capture up to 5 high-res photos or 20s compressed video clips (handled via Cloud Functions).
* **Draft Mode:** Local `AsyncStorage` caching allows reports to be saved and edited offline before submission.
* **Live Tracking:** Real-time push notifications trigger as the ticket moves through the resolution pipeline.

### Dispatcher (Control Room)
* **Geospatial Deduplication:** Intelligent "Duplicate-Merge Assistant" detects reports within a configurable radius/time window to prevent redundant work orders.
* **SLA Management:** Visual countdowns on deadlines with automatic flagging of overdue tickets.
* **Zone Management:** Polygon-based filtering to assign issues to specific regional teams.

### Field Engineer (On-Site)
* **Evidence Gates:** The system strictly enforces the upload of "After" media. A ticket cannot be marked `Resolved` without proof of fix.
* **Proximity Routing:** Integrated greedy nearest-neighbor logic to sort daily job queues by distance.

### Quality Auditor (Governance)
* **Side-by-Side Verification:** Specialized UI comparing "Before" and "After" media on a single screen.
* **Rejection Taxonomy:** Structured feedback loops when reopening a job (e.g., "Fix Incomplete") to inform engineer training.

---

## 🛠 Technical Architecture & Performance

### Security & RBAC
* **Custom Claims:** Authorization is handled via Firebase Auth Custom Claims (`admin`, `engineer`, `auditor`), not client-side boolean flags.
* **Row-Level Security:** Firestore Rules enforce strict ownership. Citizens can only read their own drafts; Engineers can only write to documents assigned to their UID.
* **Storage Policies:** Directory-level security rules ensure only assigned Engineers can upload to specific `/resolution-proof/` bucket paths.

### Performance & Resilience
* **Optimistic UI:** Critical user flows function offline with background synchronization when connectivity is restored.
* **Virtualized Lists:** Implemented `FlashList` to maintain 60fps scrolling even with massive ticket datasets.
* **Cloud Functions:** Server-side image resizing and video compression to minimize bandwidth usage for field staff.

### Tech Stack
* **Frontend:** React Native (Expo Managed Workflow)
* **Backend:** Firebase (Firestore, Cloud Functions, Storage, Auth)
* **Mapping:** [Insert Map Provider, e.g., React Native Maps]
* **State Management:** [Insert State Lib, e.g., Zustand or Context API]
