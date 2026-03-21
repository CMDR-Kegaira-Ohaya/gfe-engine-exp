# AENAONEQU3 — Canonical Equation System (Formed Existence v15.7)

Status: ACTIVE (canonical)
Supersedes: AENAONEQU2 (deprecated)
Date: 2026-03-20
Scope: This file is a mathematical/structural canon for the v15.7 Formed Existence machine.
Non-scope: It does not introduce any ontology beyond the v15.7 governing sources.

---

## 0) Core doctrines (hard invariants)

1) **Kernel > Spec > Downstream renderings.** The matrix/dashboard are projections; no proposition originates there.

2) **Depth order ≠ scan order.** Scan/traversal order never determines structural dependence order.

3) **Structural distinctions and process distinctions must not share the same slot.**

4) **Canonical relation form:** every interaction is ternary
   \[
   M(\alpha_{\text{source}},\alpha_{\text{medium}},\alpha_{\text{receiving}})\to P,
   \]
   with **the medium always participating** (binary notation is shorthand with implicit medium).
   
   - The medium is never “absent”; every concrete interaction is realized at some lower \(o\) within an ambient \(\alpha_{\text{universe}}\).

5) **Payload unfolding and payload register are distinct:**
- unfolding \(u\in\{\text{acute},\text{accumulated}\}\)
- register \(r\in\{\text{retained},\text{emitted}\}\)

Emission is the **emitted register**, not a peer of acute/accumulated.

6) **Exact payload schema (kernel-canonical):**
   \[
   p = (\sigma, d, u, r, \mu, \varepsilon),\qquad
   \varepsilon=(\Delta R_d,\Delta I_d,\delta_d).
   \]
   Payload acts on **nested** target structure within \(\alpha\); it is evental rather than part of static profile coordinates.

7) **Cfg determines local admissibility, prevalence, compensation, and threshold handling.**

8) **Θ is mirrored threshold mode under strain.** Prevalence remains operative across Θ.

9) **Destructive remains destructive across both sides; in destruction handling, the relevant \(A\) contracts.**
   
   - Misalignment contests within \(A\); \(\mathrm{Dst}\) reduces \(A\) itself.

10) **Anti-flattening rules (hard):**
- Do not treat \(\alpha_s,\alpha_m,\alpha_t,u,r,\mu\) as the same kind of term.
- Do not reduce relations to simple source→target weights.
- Structural axes locate; payload unfolding/register describe process.
- Same-locus different-order addresses and face-distinctions are valid relation targets.
11) **Face doctrine (hard):**
- inner/outer are face distinctions (not new categories).
- “Reflected payload” is a face distinction in the same process.
- Outer face is conditioned by emitted payload and by the history of retained loading.

---

## 1) Sets and basic types

### 1.1 Participants (loci)

Let \(\mathcal{A}\) be the set of loci (“participants”). A locus is addressed as
\[
\alpha_{(\ell,o,f)},
\]
where:

- \(\ell\) is the locus label (identity handle),
- \(o\) is structural nesting (formed order),
- \(f\) is face index (inner/outer face are treated as face distinctions, not new categories).

(Implementation note: \(\alpha\) is a nested object; a convenient read is \(\alpha_\ell[o,f][d]\).)

### 1.2 Maintained axes

\[
D=\{\mathrm{Cfg},\mathrm{Emb},\mathrm{Org},\mathrm{Dir},\mathrm{Leg}\}.
\]

### 1.3 Family / sigma

\[
\Sigma=\{L,M,\mathrm{Dst}\}
\]
where:

- \(L\) = aligned
- \(M\) = misaligned
- \(\mathrm{Dst}\) = destructive / ruin

### 1.4 Unfolding and register

\[
U=\{\text{acute},\text{accumulated}\},\qquad
\mathrm{Reg}=\{\text{retained},\text{emitted}\}.
\]

### 1.5 Modes (engine core field)

\[
\mathcal{M}_{\text{mode}}=\{
\text{load},\text{route},\text{overflow},\text{substitute},\text{suppress},\text{amplify},\text{threshold\_transfer}
\}.
\]

---

## 2) Canonical state at a locus

For each locus \(\alpha\in\mathcal{A}\), axis \(d\in D\), and step \(n\in\mathbb{N}\), define the **axis-state**:

\[
x_{\alpha,d}^n=\bigl(A_{\alpha,d}^n,\,R_{\alpha,d}^n,\,I_{\alpha,d}^n,\,\sigma_{\alpha,d}^n,\,v_{\alpha,d}^n\bigr)
\]

with:

- \(A_{\alpha,d}^n\in[0,1]\): availability (current available regime-space readout on that axis under its accumulation-history)
- \(R_{\alpha,d}^n\in[0,1]\): retention (held load)
- \(I_{\alpha,d}^n\in[0,1]\): intensity/tension magnitude (may rise or fall; sign can be carried in increments)
- \(\sigma_{\alpha,d}^n\in\Sigma\): local family-state at that axis
- \(v_{\alpha,d}^n\): \(\alpha_d\)-valence (dimension-qualified disposition; free text label but must remain dimension-specific)

Collect the five axes as:
\[
X_\alpha^n=(x_{\alpha,d}^n)_{d\in D}.
\]

Kernel-aligned notes:

- \(A\) is **not** identical with pressure, capacity, or occupancy.
- Misalignment contests within \(A\); \(\mathrm{Dst}\) reduces \(A\) itself.
- Equilibria (conceptual): initial and post-resolution equilibria satisfy \(A=R=I\) on the resolved axis (relaxation laws are implementation-chosen but must preserve this attractor).

### 2.1 Prevalence and Θ (threshold mirror)

Prevalence is a **Cfg-determined** label:
\[
\mathrm{Prev}_\alpha^n=\mathrm{Prev}(x_{\alpha,\mathrm{Cfg}}^n)\in\{L,M\},
\]
(optionally accompanied by a note).

Θ is a **mirrored threshold mode** flag:
\[
\Theta_\alpha^n=\bigl(\theta_\alpha^n,\; \mathrm{blocked\_family}_\alpha^n\bigr),
\]
where \(\theta_\alpha^n\in\{0,1\}\) and \(\mathrm{blocked\_family}_\alpha^n\in\{L,M\}\) when active.

### 2.2 Compensation flags (case-local)

\[
\kappa_\alpha^n\in\{0,1\},\qquad
\tau_\alpha^n\in\{\text{adaptive},\text{maladaptive}\}\ \text{(only meaningful if }\kappa_\alpha^n=1\text{)}.
\]

### 2.3 Observability substrate

\[
\Omega^n \ \text{(ambient observability substrate; optional for dynamics)}.
\]

Define an embedding (implementation-specific):
\[
O_\alpha^n = E\!\left(X_\alpha^n,\mathrm{Prev}_\alpha^n,\Theta_\alpha^n,\kappa_\alpha^n,\tau_\alpha^n,\Omega^n\right).
\]

### 2.4 Dashboard / engine scale mapping (normative)

The engine’s JSON often uses \(0\text{–}100\) for \(A,R,I\). Canonical math uses \([0,1]\).

- from dashboard to canonical:
  \[
  A=\frac{A^{(100)}}{100},\ \ R=\frac{R^{(100)}}{100},\ \ I=\frac{I^{(100)}}{100}.
  \]

- from canonical to dashboard:
  \[
  A^{(100)}=100A,\ \ R^{(100)}=100R,\ \ I^{(100)}=100I.
  \]

---

## 3) Payload: canonical relation + event schema

### 3.1 Canonical relation form

Every concrete interaction is realized as:
\[
M(\alpha_s,\alpha_m,\alpha_t)\to P,
\]
where:

- \(\alpha_s\) is the source locus,
- \(\alpha_m\) is the medium locus,
- \(\alpha_t\) is the receiving locus,
- \(P\) is a (possibly multi-expression) payload bundle.

### 3.2 Primitive payload tuple (kernel-canonical)

A **primitive** payload expression is:
\[
p = (\sigma, d, u, r, \mu, \varepsilon),\qquad \varepsilon=(\Delta R_d,\Delta I_d,\delta_d).
\]

Type constraints:

- \(\sigma\in\Sigma\) (family expression)
- \(d\in D\) (axis)
- \(u\in U\) (unfolding)
- \(r\in \mathrm{Reg}\) (register)
- \(\mu\) (mode/operator metadata; includes routing/substitution as modes)
- \(\Delta R_d\in\mathbb{R}\) (retention increment contribution; usually \(\ge 0\) for retained landing)
- \(\Delta I_d\in\mathbb{R}\) (intensity increment contribution; can be positive or negative)
- \(\delta_d\in\mathbb{R}\) (availability impulse; negative values contract/contest availability)

**Multi-expression rule (kernel):** a concrete interaction may carry one or several dimensional family expressions.
Formally, the emitted bundle is a finite multiset \(P=\{p_i\}_{i=1}^k\).

### 3.3 Engine-core expanded event fields (common implementation)

For a primitive payload expression \(p\):

- source \(s(p)\), receiving \(t(p)\)
- axis \(d(p)\in D\)
- sigma \(\sigma(p)\in\Sigma\)
- unfolding \(u(p)\in\{\text{acute},\text{accumulated}\}\)
- register \(r(p)\in\{\text{retained},\text{emitted}\}\)
- mode \(m(p)\in\mathcal{M}_{\text{mode}}\)
- magnitude \(g(p)\in[0,1]\)

Optional descriptive metadata:

- face \(\in\{\text{inner},\text{outer}\}\) (face is a structural side; reflection is face-handling)
- bearing (string), interference (string), effect (string)

### 3.4 Magnitude normalization (normative)

If the case JSON uses magnitude \(G\in\{1,\dots,10\}\), convert to:
\[
g=\frac{G}{10}\in[0,1].
\]

---

## 4) Event-to-increment primitives (v15.7 dynamics hooks)

Fix per-mode coefficients (chosen once per implementation):

- \(\eta_R(m)\ge 0\): retention increment weight
- \(\eta_I(m)\ge 0\): intensity increment weight
- \(\eta_A(m)\ge 0\): misalignment availability-contest weight
- \(\eta_{\mathrm{Dst}}(m)\ge 0\): destructive availability-contraction weight

Unfolding weights:
\[
w_{\text{acute}}=1,\qquad w_{\text{acc}}\in(0,1].
\]
Define \(w_u\) by \(w_u=w_{\text{acute}}\) if \(u=\text{acute}\), else \(w_u=w_{\text{acc}}\).

Kernel-aligned relaxation constants (implementation-chosen, but must preserve the \(A=R=I\) attractor when resolution completes):

- \(\rho_{RI}\in(0,1]\): relaxation rate driving \(I\) toward updated \(R\)
- \(\rho_{IA}\in(0,1]\): relaxation rate driving \(A\) toward updated \(I\) under admissibility

---

## 5) Aggregated increments at receiving locus

Let \(P_n\) be the multiset of **primitive** payload expressions realized at step \(n\).

For a receiving locus \(\alpha\) and axis \(d\):

### 5.1 Inbound retained load into retention

\[
\Delta R_{\alpha,d}^{(\mathrm{in}),n}
=
\sum_{\substack{p\in P_n:\\ t(p)=\alpha,\ d(p)=d,\ r(p)=\mathrm{retained}}}
\eta_R(m(p))\,w_{u(p)}\,g(p).
\]

### 5.2 Outbound emitted expression (optional emission “cost”)

\[
\Delta R_{\alpha,d}^{(\mathrm{out}),n}
=
\sum_{\substack{p\in P_n:\\ s(p)=\alpha,\ d(p)=d,\ r(p)=\mathrm{emitted}}}
\eta_R(m(p))\,w_{u(p)}\,g(p).
\]

### 5.3 Intensity perturbation term (retained landings)

\[
\Delta I_{\alpha,d}^{(\mathrm{evt}),n}
=
\sum_{\substack{p\in P_n:\\ t(p)=\alpha,\ d(p)=d,\ r(p)=\mathrm{retained}}}
\eta_I(m(p))\,w_{u(p)}\,g(p)\,s_I(p),
\]
where \(s_I(p)\in[-1,1]\) is an implementation-provided sign/shape factor (often derived from bearing/interference metadata).
(If no sign metadata is used, set \(s_I(p)=+1\).)

### 5.4 Misalignment contest term (sigma=M only)

\[
M_{\alpha,d}^n
=
\sum_{\substack{p\in P_n:\\ t(p)=\alpha,\ d(p)=d,\ \sigma(p)=M}}
\eta_A(m(p))\,w_{u(p)}\,g(p).
\]

### 5.5 Destructive contraction term (sigma=Dst only)

\[
D_{\alpha,d}^n
=
\sum_{\substack{p\in P_n:\\ t(p)=\alpha,\ d(p)=d,\ \sigma(p)=\mathrm{Dst}}}
\eta_{\mathrm{Dst}}(m(p))\,w_{u(p)}\,g(p).
\]

---

## 6) Cfg-admissibility gate (Cfg-determined)

Define an admissibility gate \(G_{\alpha}^{n}\in[0,1]\) depending **only** on current Cfg.

A simple canonical choice:
\[
G_{\alpha}^{n} = \mathrm{sigmoid}\!\left(k\left(A_{\alpha,\mathrm{Cfg}}^n-\tau_{\mathrm{Cfg}}\right)\right),
\qquad k>0,\ \tau_{\mathrm{Cfg}}\in(0,1).
\]

Interpretation:

- \(G_\alpha^n\) gates **admissible reconfiguration** (especially \(A\)-adjustment toward new equilibrium).
- It must not erase the hard doctrine that destructive handling contracts \(A\) on the relevant axis.

---

## 7) Update equations (minimum canonical dynamics)

### 7.1 Helper: clipping operator

\[
\mathrm{clip}_{[0,1]}(x)=\max(0,\min(1,x)).
\]

### 7.2 Retention update (v15.7 explicit)

Let \(\lambda_{\mathrm{emit}}\ge 0\) be an optional emission cost prefactor
(set \(\lambda_{\mathrm{emit}}=0\) if emission should not reduce retention).

\[
R_{\alpha,d}^{n+1}
=
\mathrm{clip}_{[0,1]}
\Bigl(
R_{\alpha,d}^{n}
+
\Delta R_{\alpha,d}^{(\mathrm{in}),n}
-
\lambda_{\mathrm{emit}}\Delta R_{\alpha,d}^{(\mathrm{out}),n}
\Bigr).
\]

### 7.3 Intensity update (kernel-aligned template)

Kernel constraint: retained payload is taken into \(R\), and **changes in \(R\)** create intensity movement.

A minimal template:
\[
I_{\alpha,d}^{n+1}
=
\mathrm{clip}_{[0,1]}
\Bigl(
I_{\alpha,d}^{n}
+
\Delta I_{\alpha,d}^{(\mathrm{evt}),n}
+
\rho_{RI}\bigl(R_{\alpha,d}^{n+1}-I_{\alpha,d}^{n}\bigr)
\Bigr).
\]

(Other \(I\)-laws are allowed, but must preserve: acute/accumulated retained payload can produce acute/accumulated intensity, and intensity is driven by retained-history.)

### 7.4 Availability update (kernel-aligned template)

Kernel constraints:

- Misalignment contests within \(A\).
- Destructive handling contracts \(A\) itself.
- Under retained-history, \(A\) changes **under Cfg-admissibility**.

A minimal template:
\[
A_{\alpha,d}^{n+1}
=
\mathrm{clip}_{[0,1]}
\Bigl(
A_{\alpha,d}^{n}
-
M_{\alpha,d}^{n}
-
D_{\alpha,d}^{n}
+
G_{\alpha}^{n}\,\rho_{IA}\bigl(I_{\alpha,d}^{n+1}-A_{\alpha,d}^{n}\bigr)
\Bigr).
\]

This implements:

- unconditional contraction/contest from \(M\) and \(\mathrm{Dst}\),
- admissibility-gated relaxation of \(A\) toward the post-retention intensity state.

> Note: Plastic deformation, overflow routing, substitution, suppression, and collapse of fielded relation are distinct grammars; their full discrete-time laws remain implementation-chosen, but must not contradict the doctrines above.

---

## 8) Envelope (grounding triangle recurrence)

Define three axis-derived predicates/regions at locus \(\alpha\), step \(n\):

- \(\mathrm{Adm}_\alpha^n = \mathrm{Adm}(x_{\alpha,\mathrm{Cfg}}^n)\)  (admissible hold)
- \(\mathrm{Bear}_\alpha^n = \mathrm{Bear}(x_{\alpha,\mathrm{Emb}}^n)\) (bearable support)
- \(\mathrm{Coh}_\alpha^n = \mathrm{Coh}(x_{\alpha,\mathrm{Org}}^n)\)  (coherent integration)

Envelope (conceptual intersection):
\[
\mathrm{Env}_\alpha^n
=
\mathrm{Adm}_\alpha^n \cap \mathrm{Bear}_\alpha^n \cap \mathrm{Coh}_\alpha^n.
\]

(These operators are intentionally left as definitional hooks; implementations may operationalize them as thresholds, inequalities, or learned maps, but must preserve grounding-triangle separation.)

---

## 9) Minimal canonical parameter list (implementation-chosen constants)

The following constants are chosen once per implementation:

- \(\eta_R(m),\eta_I(m),\eta_A(m),\eta_{\mathrm{Dst}}(m)\) for each mode \(m\in\mathcal{M}_{\text{mode}}\)
- \(w_{\text{acc}}\in(0,1]\)
- \(k>0,\ \tau_{\mathrm{Cfg}}\in(0,1)\)
- \(\lambda_{\mathrm{emit}}\ge 0\)
- \(\rho_{RI}\in(0,1],\ \rho_{IA}\in(0,1]\)
- (optional) \(s_I(\cdot)\) sign/shape policy

---

## 10) JSON alignment notes (engine core)

When expressing a case in engine JSON:

- Axes state is recorded per participant per timestep as:
  \[
  \{A^{(100)},R^{(100)},I^{(100)},\sigma,\text{valence}\}\ \text{for each axis }d\in D.
  \]
- Prevalence is stored as:
  \[
  \{\text{family} \in \{L,M\}, \text{note}\}
  \]
- Θ is stored as:
  \[
  \{\text{active}, \text{blocked\_family}\in\{L,M\}, \text{note}\}
  \]
- Compensation is stored as:
  \[
  \{\text{active}, \text{type}\in\{\text{adaptive},\text{maladaptive}\}, \text{note}\}.
  \]
- Primitive payload expressions use:
  \[
  (\sigma,\text{axis},\text{unfolding},\text{register},\text{mode},\text{magnitude})
  \]
  plus optional face/bearing/interference metadata.
- Multi-expression payloads are represented as a list of primitive expressions per interaction step.

---

End of AENAONEQU3
