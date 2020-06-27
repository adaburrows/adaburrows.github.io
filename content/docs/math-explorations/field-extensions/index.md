---
title: Field Extensions
name: field-extensions
description: "Field extensions are the technical term for things like imaginary numbers. There's quarternions, octonions, and another set of objects I found in college."
weight: 2
draft: true
---

# Field Extensions

Field extensions are various kinds of numbers added onto a number field. For instance the fundamental theorem of algebra requires that imaginary numbers exist in order to have the right number of zeroes for a equation. Quarernions are another sort of field exension. So are Octonions.

I was pondering this in college and I realized that the sign of a number (positive/negative) was essentially treated as a integer modulo two. The rules of incrementing the number are purely multiplicative and follow the rules of exponents, except with the modulo. For instance, imagine that the exponent is really a sign:

{{< katex display >}}
\begin{aligned}
  a^0 & = a \\
  a^1 & = -a \\
  a^1 \cdot a^1 & = a \\
  a^1 \cdot a^1 \cdot a^1 & = -a \\
  a^n & = a^{n \}
\end{aligned}
{{< /katex >}}

This means that if we apply he same logic to finding square roots of these "signs" as exponents with modulo arithmetic, we get a very familiar equation:

{{< katex display >}}
\sqrt{a^x} = a^{\frac{x}{2}}
{{< /katex >}}

We know that a positive sign is equivalent to 0 and 
