# Changelog

All notable changes to this project will be documented in this file.

The format is based on **[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)**, and this project adheres to **[Semantic Versioning](https://semver.org/spec/v2.0.0.html)**.

---

## [Unreleased]

- **Added**
  - Initial `@plasius/gpu-debug` package scaffold based on the Plasius package
    standard.
  - Opt-in debug session API for tracked allocations, queue samples, dispatch
    samples, and frame-budget summaries.
  - ADRs, TDRs, design docs, unit tests, and a runnable console demo.

- **Changed**
  - Debug instrumentation guidance now documents inferred metrics and
    host-supplied hardware hints instead of claiming unavailable portable
    WebGPU counters.
  - Updated package maintenance guidance to use the Node 24 baseline reflected in
    `.nvmrc`.

- **Fixed**
  - N/A

- **Security**
  - Local-only instrumentation and analytics routing constraints documented.
