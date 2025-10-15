#!/bin/bash

# Script to track progress of documentation scraping
# This will help me organize the massive scraping task

BASE_DIR="/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-yield/docs/yield_xyz"

# Overview Section URLs (still working on)
declare -a OVERVIEW_URLS=(
    "/docs/actions:overview/actions.md"
    "/docs/balances:overview/balances.md"
    "/docs/shield:overview/shield.md"
)

# Supported Yields Section
declare -a SUPPORTED_YIELDS_URLS=(
    "/docs/staking-yields:supported-yields/staking.md"
    "/docs/aave-lending:supported-yields/defi.md"
    "/docs/stablecoin-yields:supported-yields/stablecoins.md"
)

# Getting Started Section
declare -a GETTING_STARTED_URLS=(
    "/docs/creating-an-api-key:getting-started/project-setup.md"
    "/docs/widget:getting-started/widget.md"
    "/docs/signers-packages:getting-started/signers-package.md"
    "/docs/rate-limits-and-plans:getting-started/rate-limits.md"
    "/docs/terms-of-use:getting-started/terms-of-use.md"
    "/docs/privacy-policy:getting-started/privacy-policy.md"
    "/docs/security-notices:getting-started/security-notices.md"
)

# Advanced Setup Section
declare -a ADVANCED_SETUP_URLS=(
    "/docs/geoblocking:advanced-setup/geoblocking.md"
    "/docs/whitelabel-validator-nodes:advanced-setup/whitelabel-nodes.md"
    "/docs/bring-your-own-node:advanced-setup/bring-your-own-node.md"
)

# FAQs Section
declare -a FAQS_URLS=(
    "/docs/faqs:faqs/faqs.md"
)

# Legacy Docs Section
declare -a LEGACY_URLS=(
    "/docs/legacy-docs-v1:legacy/legacy-docs-v1.md"
    "/docs/api-20-migration-guide-workflow-and-schema-changes:legacy/api-20-migration-guide.md"
)

echo "Documentation Scraping Progress Tracker"
echo "========================================"
echo ""
echo "Total URLs to scrape: ~35"
echo "Progress will be tracked here"
