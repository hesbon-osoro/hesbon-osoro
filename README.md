## Hi <img src="./assets/icons/wave.gif" height="24px" width="24px" alt="hi">,

[![I'm Hesbon, A.K.A Wazimu: Software & Platform Engineer](assets/cards/typing.svg)](https://hesbon.dev/)

🚀 **Software Engineer | Platform & DevOps | Full-Stack Developer | AI & Cybersecurity Enthusiast**

> 🛠️ **New**: [Repository Management Tools](./REPO_MANAGEMENT.md) - Automatically clone and manage all portfolio projects

[![hesbon-dev.png](assets/projects/hesbon-dev.png)](https://hesbon.dev/)

[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-2FA4D7?style=for-the-badge&logo=netlify)](https://hesbon.dev/)
[![CI](https://github.com/hesbon-osoro/hesbon-osoro/actions/workflows/ci.yml/badge.svg)](https://github.com/hesbon-osoro/hesbon-osoro/actions/workflows/ci.yml)

## 👨‍💻 About Me

As a **Software Engineer** with 3+ years in the field, I thrive on the process of transforming complex problems into **impactful, scalable solutions**. My experience spans delivering **production-grade web applications** (featured in [Sample Projects](#sample-projects)), building the **cloud platforms they run on**, and contributing to cutting-edge **AI model training and data enhancement**.

I view every project as a new challenge and a chance to evolve. I collaborate closely with diverse stakeholders to deliver efficient results, always staying updated on the latest trends and sharing my refined solutions with the wider community.

- 🌐 Delivered 30+ production-ready projects (React, Next.js, Node.js, GraphQL, PostgreSQL, MongoDB).
- ☸️ Design containerised services for Kubernetes with Terraform-managed AWS infrastructure and GitHub Actions CI/CD ([see the showcase](#platform-showcase)).
- 🤖 Contributed to AI model training & dataset validation for research and academic projects.
- 🔐 Self-driven in **CompTIA Ethical Hacking** and **HackTheBox** labs.
- 🎓 Background in mathematics, data modeling, and content evaluation.

## 🛠️ Tech Stack

**Languages:** Go, TypeScript, JavaScript, Rust, Python, SQL, Bash  
**Frontend & APIs:** React, Next.js, Node.js, GraphQL, REST  
**Cloud & Platform:** AWS (EKS, ECR, IAM, VPC), Docker, Kubernetes, Kustomize, Terraform  
**DevOps & SRE:** GitHub Actions (OIDC), Prometheus, SLOs & error budgets, Nginx, Linux, Git  
**Databases:** PostgreSQL, MongoDB, MySQL, Firebase  
**Security:** Ethical Hacking (CompTIA), HackTheBox, least-privilege IAM, Pod Security Standards  
**Other:** Academic writing, research, data annotation

<p align="left">
  <img src="assets/cards/stack-code.svg" alt="Go, Rust, TypeScript, JavaScript, Python, React, Next.js, Node.js, GraphQL, HTML, CSS" />
  <br />
  <img src="assets/cards/stack-platform.svg" alt="Docker, Kubernetes, Terraform, AWS, GitHub Actions, Prometheus, Nginx, Linux, Bash, Git" />
  <br />
  <img src="assets/cards/stack-data.svg" alt="PostgreSQL, MongoDB, MySQL, Firebase" />
</p>

<h2 id="platform-showcase">🧰 Platform Engineering Showcase</h2>

Production-style reference code in [`showcase/`](https://github.com/hesbon-osoro/hesbon-osoro/tree/main/showcase), linted, tested, and validated on every push by [CI](https://github.com/hesbon-osoro/hesbon-osoro/actions/workflows/ci.yml).

| Area              | What it demonstrates                                                                                                         | Code                                                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☸️ **Kubernetes** | Kustomize base + staging/production overlays, zero-downtime rollouts, HPA, PDB, NetworkPolicy, restricted Pod Security, IRSA | [deploy/k8s](https://github.com/hesbon-osoro/hesbon-osoro/tree/main/showcase/deploy/k8s)                                                                                                                   |
| 🐳 **Docker**     | Multi-arch, cache-mounted build producing an ~8 MB distroless, non-root image with a built-in healthcheck                    | [Dockerfile](https://github.com/hesbon-osoro/hesbon-osoro/blob/main/showcase/services/orders-api/Dockerfile)                                                                                               |
| 🏗️ **Terraform**  | AWS VPC + EKS (KMS-encrypted secrets, IMDSv2, access entries), ECR lifecycle rules, keyless GitHub OIDC deploy role          | [infra/terraform](https://github.com/hesbon-osoro/hesbon-osoro/tree/main/showcase/infra/terraform)                                                                                                         |
| 🐹 **Go**         | Orders API with graceful drain for K8s, idempotency keys, Prometheus RED metrics, structured logs, race-tested               | [orders-api](https://github.com/hesbon-osoro/hesbon-osoro/tree/main/showcase/services/orders-api)                                                                                                          |
| 🦀 **Rust**       | Thread-safe keyed token-bucket rate limiter with a deterministic test clock, clippy-pedantic clean                           | [edge-ratelimit](https://github.com/hesbon-osoro/hesbon-osoro/tree/main/showcase/services/edge-ratelimit)                                                                                                  |
| 🟦 **TypeScript** | Retry with full-jitter exponential backoff, abort support, and a half-open circuit breaker                                   | [resilience-ts](https://github.com/hesbon-osoro/hesbon-osoro/tree/main/showcase/services/resilience-ts)                                                                                                    |
| 📈 **SRE**        | Multi-window burn-rate SLO alerts and a Python error-budget release gate                                                     | [observability](https://github.com/hesbon-osoro/hesbon-osoro/tree/main/showcase/deploy/observability) · [slo_budget.py](https://github.com/hesbon-osoro/hesbon-osoro/blob/main/showcase/ops/slo_budget.py) |
| 🚀 **CI/CD**      | GitHub Actions: gofmt/vet/race, clippy, tsc, kubeconform, terraform validate, shellcheck, buildx                             | [ci.yml](https://github.com/hesbon-osoro/hesbon-osoro/blob/main/.github/workflows/ci.yml)                                                                                                                  |
| 🐚 **Bash**       | Digest-pinned deploy with server-side dry run, smoke test and automatic rollback                                             | [deploy.sh](https://github.com/hesbon-osoro/hesbon-osoro/blob/main/showcase/ops/deploy.sh)                                                                                                                 |

<details>
<summary><b>Peek at the code</b></summary>

**Kubernetes: never drop capacity during a rollout, and run locked down**

```yaml
strategy:
  rollingUpdate:
    maxSurge: 25%
    maxUnavailable: 0
template:
  spec:
    securityContext:
      runAsNonRoot: true
      seccompProfile: { type: RuntimeDefault }
    containers:
      - name: orders-api
        readinessProbe: { httpGet: { path: /readyz, port: http } }
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities: { drop: ['ALL'] }
```

**Go: drain before shutdown so Kubernetes stops routing traffic first**

```go
<-ctx.Done()                  // SIGTERM from the kubelet
app.ready.Store(false)        // /readyz -> 503, pod leaves Service endpoints
time.Sleep(cfg.DrainDelay)    // let kube-proxy / ingress catch up
return srv.Shutdown(shutdownCtx) // finish in-flight requests
```

**Terraform: CI deploys to AWS with short-lived OIDC tokens, no stored keys**

```hcl
condition {
  test     = "StringLike"
  variable = "token.actions.githubusercontent.com:sub"
  values = [
    "repo:${var.github_repository}:ref:refs/heads/main",
    "repo:${var.github_repository}:ref:refs/tags/v*",
  ]
}
```

**Docker: distroless, non-root, self-checking**

```dockerfile
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/orders-api /orders-api
USER nonroot:nonroot
HEALTHCHECK CMD ["/orders-api", "healthcheck"]
ENTRYPOINT ["/orders-api"]
```

</details>

### 📊 Monthly development breakdown

<!--START_SECTION:waka-->

```txt
From: 08 September 2026 - To: 08 October 2026

Python       17 hrs 19 mins        █████████▒░░░░░░░░░░░░░░░   37.20 %
Markdown     16 hrs 26 mins        ████████▓░░░░░░░░░░░░░░░░   35.28 %
TypeScript   4 hrs 14 mins         ██▒░░░░░░░░░░░░░░░░░░░░░░   09.10 %
HTML         2 hrs 43 mins         █▒░░░░░░░░░░░░░░░░░░░░░░░   05.84 %
Other        1 hr 45 mins          █░░░░░░░░░░░░░░░░░░░░░░░░   03.77 %
```

<!--END_SECTION:waka-->

<!-- prettier-ignore-start -->

<h2 id="sample-projects">📂 Featured Projects</h2>
<table>
  <tbody>
    <tr>
      <td width="50%">
        <a href="https://restaurant-ecommerce.netlify.app/">
          <img
            width="100%"
            src="assets/projects/restaurant.png"
            alt="Restaurant E-commerce"
          />
        </a>
        <br />
        <a href="https://restaurant-ecommerce.netlify.app/">Restaurant E-commerce site</a>
        <br />
        <a href="https://github.com/hesbon-osoro/restaurant">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://hampi-tourism-site-hb.netlify.app/">
          <img alt="Tourism Hampi screenshot"
            width="100%"
            src="assets/projects/hampi.png"
          />
        </a>
        <br />
        <a href="https://hampi-tourism-site-hb.netlify.app/">Tourism Hampi</a>
        <br />
        <a href="https://github.com/hesbon-osoro/tourism-hampi">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://video-app-hb.netlify.app/">
          <img alt="Video App screenshot"
            src="assets/projects/video-app.png"
            width="100%"
          />
        </a>
        <br />
        <a href="https://video-app-hb.netlify.app/">Video App</a>
        <br />
        <a href="https://github.com/hesbon-osoro/video-app">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://chat-app-merng.netlify.app/">
          <img alt="Chat App screenshot"
            src="assets/projects/chatapp.png"
            width="100%"
          />
        </a>
        <br />
        <a href="https://chat-app-merng.netlify.app/">Chat App</a>
        <br />
        <a href="https://github.com/hesbon-osoro/chat-app-merng-client">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://dating-site-frontend.netlify.app/">
          <img alt="Dating Site screenshot"
            width="100%"
            src="assets/projects/dating-app-frontend.png"
          />
        </a>
        <br />
        <a href="https://dating-site-frontend.netlify.app/">Dating Site</a>
        <br />
        <a href="https://github.com/hesbon-osoro/dating-app-frontend">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://salad-hb.netlify.app/">
          <img alt="Salad site screenshot"
            width="100%"
            src="assets/projects/salad.png"
          />
        </a>
        <br />
        <a href="https://salad-hb.netlify.app/">Salad site</a>
        <br />
        <a href="https://github.com/hesbon-osoro/salad">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://agency-site-hb.netlify.app/">
          <img alt="Agency Site screenshot"
            width="100%"
            src="assets/projects/agency-site.png"
          />
        </a>
        <br />
        <a href="https://agency-site-hb.netlify.app/">Agency Site</a>
        <br />
        <a href="https://github.com/hesbon-osoro/agency-site">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://portfolio-hb.netlify.app/">
          <img alt="Sample Portfolio screenshot"
            width="100%"
            src="assets/projects/portfolio-hb.png"
          />
        </a>
        <br />
        <a href="https://portfolio-hb.netlify.app/">Sample Portfolio</a>
        <br />
        <a href="https://github.com/hesbon-osoro/portfolio-hb">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://recipes-homemade-hb.netlify.app/">
          <img alt="Recipes Homemade screenshot"
            width="100%"
            src="assets/projects/recipes.png"
          />
        </a>
        <br />
        <a href="https://recipes-homemade-hb.netlify.app/">Recipes Homemade</a>
        <br />
        <a href="https://github.com/hesbon-osoro/recipes-homemade">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://messaging-app-frontend.web.app/">
          <img alt="Messaging App screenshot" src="assets/projects/messaging2.png" width="100%" />
        </a>
        <br />
        <a href="https://messaging-app-frontend.web.app/">Messaging App</a>
        <br />
        <a href="https://github.com/hesbon-osoro/messaging-app-frontend">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://reactjs-shoppy-admin-dashboard.netlify.app/">
          <img alt="Shoppy Dashboard screenshot"
            width="100%"
            src="assets/projects/shoppy-dashboard.png"
          />
        </a>
        <br />
        <a href="https://reactjs-shoppy-admin-dashboard.netlify.app/">Shoppy Dashboard</a>
        <br />
        <a href="https://github.com/hesbon-osoro/shoppy-admin-dashboard">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://simple-multistep-form.netlify.app/">
          <img alt="Simple Multi-step form screenshot" src="assets/projects/simple-multistep.png" width="100%" />
        </a>
        <br />
        <a href="https://simple-multistep-form.netlify.app/">Simple Multi-step form</a>
        <br />
        <a href="https://github.com/hesbon-osoro/simple-multistep-form">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://react-alarm-clock.netlify.app/">
          <img alt="Alarm Clock screenshot"
            width="100%"
            src="assets/projects/alarm-clock.png"
          />
        </a>
        <br />
        <a href="https://react-alarm-clock.netlify.app/">Alarm Clock</a>
        <br />
        <a href="https://github.com/hesbon-osoro/alarm-clock">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://snake-game-ts.netlify.app/">
          <img alt="Snake Game screenshot" src="assets/projects/snake-game.png" width="100%" />
        </a>
        <br />
        <a href="https://snake-game-ts.netlify.app/">Snake Game</a>
        <br />
        <a href="https://github.com/hesbon-osoro/snake-game">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://reactjs-chess.vercel.app/">
          <img alt="React Chess screenshot"
            width="100%"
            src="assets/projects/react-chess.png"
          />
        </a>
        <br />
        <a href="https://reactjs-chess.vercel.app/">React Chess</a>
        <br />
        <a href="https://github.com/hesbon-osoro/react-chess">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://reactjs-sort-visualizer.netlify.app/">
          <img alt="Sort Visualizer screenshot" src="assets/projects/sort-visualizer.png" width="100%" />
        </a>
        <br />
        <a href="https://reactjs-sort-visualizer.netlify.app/">Sort Visualizer</a>
        <br />
        <a href="https://github.com/hesbon-osoro/sort-visualizer">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://reactts-shopping-cart.netlify.app/">
          <img alt="Shopping Cart screenshot"
            width="100%"
            src="assets/projects/shopping-cart.png"
          />
        </a>
        <br />
        <a href="https://reactts-shopping-cart.netlify.app/">Shopping Cart</a>
        <br />
        <a href="https://github.com/hesbon-osoro/shopping-cart">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://custom-pagination-react.netlify.app/">
          <img alt="Custom Pagination screenshot" src="assets/projects/custom%20pagination.png" width="100%" />
        </a>
        <br />
        <a href="https://custom-pagination-react.netlify.app/">Custom Pagination</a>
        <br />
        <a href="https://github.com/hesbon-osoro/custom-pagination">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://react-custom-select.netlify.app/">
          <img alt="Custom Select screenshot"
            width="100%"
            src="assets/projects/react-select.png"
          />
        </a>
        <br />
        <a href="https://react-custom-select.netlify.app/">Custom Select</a>
        <br />
        <a href="https://github.com/hesbon-osoro/react-select">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://reactjs-drag-and-drop.netlify.app/">
          <img alt="Drag and Drop screenshot" src="assets/projects/drag%20and%20drop.png" width="100%" />
        </a>
        <br />
        <a href="https://reactjs-drag-and-drop.netlify.app/">Drag and Drop</a>
        <br />
        <a href="https://github.com/hesbon-osoro/drag-and-drop">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://ck-editor-react.netlify.app/">
          <img alt="CK 5 Editor screenshot"
            width="100%"
            src="assets/projects/ck-editor.png"
          />
        </a>
        <br />
        <a href="https://ck-editor-react.netlify.app/">CK 5 Editor</a>
        <br />
        <a href="https://github.com/hesbon-osoro/ck-editor-react">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://tic-tac-toe-ts-game.netlify.app/">
          <img alt="Tic Tac Toe screenshot" src="assets/projects/tictactoe.png" width="100%" />
        </a>
        <br />
        <a href="https://tic-tac-toe-ts-game.netlify.app/">Tic Tac Toe</a>
        <br />
        <a href="https://github.com/hesbon-osoro/tic-tac-toe">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://face-auth.netlify.app/">
          <img alt="Face Auth screenshot"
            width="100%"
            src="assets/projects/face-auth1.png"
          />
        </a>
        <br />
        <a href="https://face-auth.netlify.app/">Face Auth</a>
        <br />
        <a href="https://github.com/hesbon-osoro/face-auth">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://dynamic-next-previous-buttons.vercel.app/">
          <img alt="Dynamic Next/Previous buttons screenshot" src="assets/projects/dynamic%20nextprev.png" width="100%" />
        </a>
        <br />
        <a href="https://dynamic-next-previous-buttons.vercel.app/">Dynamic Next/Previous buttons</a>
        <br />
        <a href="https://github.com/hesbon-osoro/dynamic-next-previous-buttons">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://nextjs-video-streaming.vercel.app/">
          <img alt="Video Stream screenshot"
            width="100%"
            src="assets/projects/video-stream2.png"
          />
        </a>
        <br />
        <a href="https://nextjs-video-streaming.vercel.app/">Video Stream</a>
        <br />
        <a href="https://github.com/hesbon-osoro/nextjs-video-streaming">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%">
        <a href="https://hesbon-osoro.github.io/MindTap/">
          <img alt="Cengage | MindTap (69 projects) screenshot"
            width="100%"
            src="assets/projects/cengage-mindtap.png"
          />
        </a>
        <br />
        <a href="https://hesbon-osoro.github.io/MindTap/">Cengage | MindTap (69 projects)</a>
        <br />
        <a href="https://github.com/hesbon-osoro/MindTap">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://follow-for-follow-back.vercel.app/">
          <img alt="Follow For Follow Back screenshot"
            width="100%"
            src="assets/projects/follow-for-follow-back-hesbon.png"
          />
        </a>
        <br />
        <a href="https://follow-for-follow-back.vercel.app/">Follow For Follow Back</a>
        <br />
        <a href="https://github.com/hesbon-osoro/follow-for-follow-back">
          <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/>
        </a>
      </td>
      <td width="50%"></td>
    </tr>
    <tr>
      <td colspan="2" align="center">
        CLICK ON THE <img src="assets/icons/github.png" width="30px" height="30px" alt="GitHub repository"/> ICON TO VIEW THE PROJECT'S REPOSITORY
      </td>
    </tr>
    <tr>
      <td colspan="2" align="center">
        CLICK ON THE PROJECT IMAGE OR THE <a href="#">BLUE LINK</a> TO VISIT THE HOSTED PROJECT
      </td>
    </tr>
  </tbody>
</table>

<!-- prettier-ignore-end -->

<h2 id="certifications">🎓 Certifications</h2>

<!-- prettier-ignore-start -->

<table>
  <tbody>
    <tr>
      <td width="50%">
        <a href="https://www.hackerrank.com/certificates/229ef084f60a">
          <img
            alt="hackerrank js basic certificate"
            width="100%"
            src="assets/certificates/hackerrank js basic.png"
          />
        </a>
        <br />
        <a href="https://www.hackerrank.com/certificates/229ef084f60a">Verify</a>
      </td>
      <td width="50%">
        <a href="https://www.hackerrank.com/certificates/12d1fbc424ce">
          <img alt="Hackerrankproblemsolving certificate"
            src="assets/certificates/Hackerrankproblemsolving.png"
            width="100%"
          />
        </a>
        <br />
        <a href="https://www.hackerrank.com/certificates/12d1fbc424ce">Verify</a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://www.codechef.com/certificates/verify">
          <img
            alt="snackdown2021 certificate"
            width="100%"
            src="assets/certificates/snackdown2021.png"
          />
        </a>
        <br />
        <a href="https://www.codechef.com/certificates/verify">Verify</a>
        <p><b>Certificate ID:</b> 94a6f28</p>
        <p><b>Username:</b> wazimu</p>
      </td>
      <td width="50%">
        <a href="https://hb-wazimu.netlify.app/#certification">
          <img alt="googlekickstart certificate"
            src="assets/certificates/googlekickstart.png"
            width="100%"
          />
        </a>
        <br />
        <a href="https://hb-wazimu.netlify.app/#certification">Verify</a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a
          href="https://www.freecodecamp.org/certification/wazimu/front-end-development-libraries"
        >
          <img
            alt="freeCodeCamp frontend dev libs certificate"
            width="100%"
            src="assets/certificates/freeCodeCamp frontend dev libs.png"
          />
        </a>
        <br />
        <a
          href="https://www.freecodecamp.org/certification/wazimu/front-end-development-libraries"
          >Verify</a
        >
      </td>
      <td width="50%">
        <a
          href="https://www.freecodecamp.org/certification/wazimu/javascript-algorithms-and-data-structures"
        >
          <img alt="freeCodeCamp JADS certification certificate"
            src="assets/certificates/freeCodeCamp JADS certification.png"
            width="100%"
          />
        </a>
        <br />
        <a
          href="https://www.freecodecamp.org/certification/wazimu/javascript-algorithms-and-data-structures"
          >Verify</a
        >
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a
          href="https://www.freecodecamp.org/certification/wazimu/responsive-web-design"
        >
          <img
            alt="freeCodeCamp RWD certification certificate"
            width="100%"
            src="assets/certificates/freeCodeCamp RWD certification.png"
          />
        </a>
        <br />
        <a
          href="https://www.freecodecamp.org/certification/wazimu/responsive-web-design"
          >Verify</a
        >
      </td>
      <td width="50%">
        <a href="https://hb-wazimu.netlify.app/#certification">
          <img alt="devfest2021 certificate"
            src="assets/certificates/devfest2021.png"
            width="100%"
          />
        </a>
        <br />
        <a href="https://hb-wazimu.netlify.app/#certification">Verify</a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://hb-wazimu.netlify.app/#certification">
          <img
            alt="googleanalytics certificate"
            width="100%"
            src="assets/certificates/googleanalytics.png"
          />
        </a>
        <br />
        <a href="https://hb-wazimu.netlify.app/#certification">Verify</a>
      </td>
      <td width="50%">
        <a href="https://hb-wazimu.netlify.app/#certification">
          <img
            alt="AWS practitioner certificate"
            width="100%"
            src="assets/certificates/AWS practitioner.png"
          />
        </a>
        <br />
        <a href="https://hb-wazimu.netlify.app/#certification">Verify</a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://hb-wazimu.netlify.app/#certification">
          <img alt="hesbon-twd certificate"
            src="assets/certificates/hesbon-twd.png"
            width="100%"
          />
        </a>
        <br />
        <a href="https://hb-wazimu.netlify.app/#certification">Verify</a>
      </td>
      <td width="50%">
        <a href="https://hb-wazimu.netlify.app/#certification">
          <img alt="AWS Elastic Beanstalk(intro) certificate"
            src="assets/certificates/AWS Elastic Beanstalk(intro).png"
            width="100%"
          />
        </a>
        <br />
        <a href="https://hb-wazimu.netlify.app/#certification">Verify</a>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <a href="https://hb-wazimu.netlify.app/#certification">
          <img alt="hourofcode certificate"
            src="assets/certificates/hourofcode.jpg"
            width="100%"
          />
        </a>
        <br />
        <a href="https://code.org/congrats?i=_1_18e783d40c7c6f10271c6612c21a4c65">Verify</a>
      </td>
      <td width="50%"></td>
    </tr>
  </tbody>
</table>

<!-- prettier-ignore-end -->

## 📈 GitHub Activity

<!-- Cards are snapshotted daily into assets/cards/ by .github/workflows/readme-cards.yml -->

<!-- prettier-ignore-start -->

<p align="center">
  <a href="https://github.com/hesbon-osoro?tab=overview">
    <img src="assets/cards/activity-graph.svg" width="100%" alt="Hesbon Osoro's contribution graph for the last 31 days" />
  </a>
</p>

<h3>🏆 Trophies</h3>

<p align="center">
  <a href="https://github.com/hesbon-osoro">
    <img src="assets/cards/trophies.svg" width="100%" alt="GitHub profile trophies" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/hesbon-osoro">
    <img src="assets/cards/stats.svg" width="49%" alt="Hesbon Osoro's GitHub stats" />
  </a>
  <a href="https://github.com/hesbon-osoro">
    <img src="assets/cards/streak.svg" width="49%" alt="GitHub contribution streak" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/hesbon-osoro/hesbon-osoro">
    <img src="assets/cards/pin.svg" width="49%" alt="hesbon-osoro/hesbon-osoro repository card" />
  </a>
  <a href="https://github.com/hesbon-osoro?tab=repositories">
    <img src="assets/cards/top-langs.svg" width="49%" alt="Most used languages across repositories" />
  </a>
</p>

<h3>🧩 LeetCode</h3>

<p align="center">
  <a href="https://leetcode.com/hesbon-osoro/">
    <img src="assets/cards/leetcode-card.svg" width="49%" alt="LeetCode card with solved problems and yearly heatmap" />
  </a>
  <a href="https://leetcode.com/hesbon-osoro/">
    <img src="assets/cards/leetcode-stats.svg" width="49%" alt="LeetCode solved problems by difficulty" />
  </a>
</p>

<h3>⏱️ WakaTime</h3>

<p align="center">
  <a href="https://wakatime.com/@wazimu">
    <img src="assets/cards/wakatime.svg" width="60%" alt="All-time WakaTime coding stats by language" />
  </a>
</p>

<p align="center">
  <a href="https://wakatime.com/@26cc90f6-22da-4220-ac7d-f452b6324239">
    <img src="https://wakatime.com/badge/user/26cc90f6-22da-4220-ac7d-f452b6324239.svg" alt="Total time coded, tracked by WakaTime" />
  </a>
</p>

<h3>👀 Unique Views</h3>

<p>
  <a href="https://github.com/hesbon-osoro/wazimu-views-counter">
    <img src="https://raw.githubusercontent.com/hesbon-osoro/wazimu-views-counter/master/svg/profile/badge.svg" alt="Unique profile views" />
  </a>
  <a href="https://github.com/hesbon-osoro?tab=followers">
    <img src="https://img.shields.io/github/followers/hesbon-osoro?label=Followers&logo=GitHub&style=for-the-badge" alt="GitHub followers" />
  </a>
</p>

<!-- prettier-ignore-end -->

### 😂 Here is a random joke for you today

![A random programming joke](assets/cards/joke.svg)

### Star my projects [here](https://github.com/hesbon-osoro?tab=repositories)

## 💼 Open To

**Roles · Offers · Opportunities**: [`Mail`](mailto:hesbonosoro1@gmail.com) me!

- 🌍 Work from home / Remote
- 🧑‍💻 _Freelance_
- 🔐 _CompTIA Ethical Hacking_ · _HackTheBox_ | _HTB_
- ✍️ _Academic Writing_
- 📚 _Cengage/MindTap_ · _zyBooks_
- 📬 Mail me your coding assignment: [osoro@hesbon.dev](mailto:osoro@hesbon.dev)

## 🤝 Let’s Connect

- 📧 Email: [osoro@hesbon.dev](mailto:osoro@hesbon.dev) | [hesbonosoro1@gmail.com](mailto:hesbonosoro1@gmail.com)
- 💼 LinkedIn: [linkedin.com/in/hesbon-osoro](https://www.linkedin.com/in/hesbon-osoro/)
- 🌍 Portfolio: [hesbon.dev](https://hesbon.dev/)
- 🐦 Twitter: [@wazimu_hb](https://twitter.com/wazimu_hb)
- 💻 GitHub: [github.com/hesbon-osoro](https://github.com/hesbon-osoro)

[GoFundMe](https://www.gofundme.com/u/hesbon-osoro)

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/wazimu)

OR [`Paypal`](https://www.paypal.com/) use <hesbonosoro1@gmail.com>

⭐️ _Feel free to explore, fork, and collaborate on my projects. Open to freelance, remote roles, and research opportunities._

<!-- Thank you. -->
<h3 align="center">Thank <img src="./assets/icons/handshake.gif" height="32px" alt="handshake" /> you</h3>
