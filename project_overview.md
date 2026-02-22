# Project Overview: Dicoding Automated Reviewer Pipeline (DARP)

## 1. Project Purpose
The Dicoding Automated Reviewer Pipeline (DARP) is a locally hosted, two-layer CI/CD automation tool designed to drastically reduce the manual toil required to review Front-End Web Development submissions (Vanilla JS & Webpack environments). It enforces static and dynamic constraints, intercepts network traffic, and audits DOM manipulation in real-time.

## 2. System Architecture
The pipeline operates on a Two-Layer architecture:

### Layer 1: The Orchestrator (Golang)
- **Auto-Targeting:** Scans the designated download directory (`~/Personal/temp/dicoding-submission/`) to automatically acquire the most recently modified `.zip` submission.
- **Environment Provisioning:** Creates an isolated temporary directory (`/tmp/dicoding-review-*`) to prevent local environment contamination.
- **Static Security & Rule Filter:** Unzips the payload while simultaneously streaming the contents to detect prohibited frameworks (React, Vue, etc.) inside `package.json` and instantly rejects the presence of `node_modules`.
- **Handoff:** Spawns the Layer 2 Node.js process and captures its exit codes.

### Layer 2: The E2E Engine (Node.js & Playwright)
- **Environment Bootstrap:** Dynamically initializes local servers (`live-server` for Sub 1, `webpack-dev-server` for Sub 2).
- **Shadow DOM Piercing:** Utilizes recursive DOM scanning to bypass encapsulation and audit Custom Elements natively.
- **Network Sniper (Interception):** Hijacks Chromium's network layer to validate REST API usage, simulate network latency (loading states), and trigger artificial failures (error handling).

---

## 3. Submission 1: Notes App (Vanilla JS + Web Components)

### Automation Map
| Criteria / Suggestion | Verification Method | Automation Status |
| :--- | :--- | :--- |
| **Criteria 1: Render 15 Dummy Notes** | Playwright (`getByText`) piercing Shadow DOM. | 🤖 Fully Automated |
| **Criteria 2: Add Note Form** | Playwright UI Interaction (Fill & Submit). | 🤖 Fully Automated |
| **Criteria 3: CSS Grid Usage** | DOM Computed Style Extraction (`display: grid`). | 🤖 Fully Automated |
| **Criteria 4: Min. 3 Web Components** | Recursive Shadow DOM Tag Scanner (`-`). | 🤖 Fully Automated |
| **Suggestion 1: Aesthetics** | Human visual inspection. | 👁️ Manual (15s Window) |
| **Suggestion 2: Realtime Validation** | Chromium `ValidityState` API Extraction. | 🤖 Fully Automated |
| **Suggestion 3: Custom Attributes** | Node Attribute Iterator filtering standard HTML tags. | 🤖 Fully Automated |
| **Suggestion 4: Responsiveness** | Viewport manipulation (390px) & Overflow check. | 🤖 Fully Automated |

---

## 4. Submission 2: Notes App (Webpack + REST API)

### Automation Map
| Criteria / Suggestion | Verification Method | Automation Status |
| :--- | :--- | :--- |
| **Criteria 1: Maintain Sub 1 Rules** | Re-runs Web Component & Grid validations. | 🤖 Fully Automated |
| **Criteria 2: REST API (CRUD)** | Network Interceptor tracking `dicoding.dev` URLs. | 🤖 Hybrid (Manual Click for Delete) |
| **Criteria 3: Webpack Bundler** | `package.json` parsing & `npm run build` exit code. | 🤖 Fully Automated |
| **Criteria 4: Fetch API Usage** | Static `grep` analysis of the `src/` directory. | 🤖 Fully Automated |
| **Criteria 5: Loading Indicator** | Network Throttling (2s delay) + DOM Text Scanner. | 🤖 Fully Automated |
| **Suggestion 1: Archive Feature** | Network Interceptor tracking `POST /archive`. | 🤖 Hybrid (Manual Click for Archive) |
| **Suggestion 2: Error Feedback** | Network Abort (Forced 500) + Alert/DOM Scanner. | 🤖 Fully Automated |
| **Suggestion 3: Smooth Animations** | Human visual inspection. | 👁️ Manual (25s Window) |
| **Suggestion 4: Prettier Code Formatter** | Filesystem scan for `.prettierrc`. | 🤖 Fully Automated |

---

## 5. Execution Protocol
1. Download the student's `.zip` file.
2. Open terminal in the pipeline root directory.
3. Execute the binary: `./reviewer <sub1|sub2> [optional-absolute-path-to-zip]`
4. Monitor the terminal logs.
5. Perform manual visual checks (aesthetics, animations) during the final automated browser freeze.
6. The temporary directory is automatically purged upon completion.
