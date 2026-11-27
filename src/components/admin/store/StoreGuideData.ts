export type SourcingKey = "stocked" | "preorder" | "dropship";

export interface StoreScreenEntry {
  title: string;
  href: string;
  whenToUse: string;
  badge: string;
}

export interface SourcingPlaybook {
  key: SourcingKey;
  label: string;
  tagline: string;
  accentClass: string;
  badgeClass: string;
  beforePurchase: Array<{ step: string; detail: string; href?: string; linkLabel?: string }>;
  afterPurchase: Array<{ step: string; detail: string; href?: string; linkLabel?: string }>;
  stockRule: string;
}

export interface TroubleshootingRow {
  symptom: string;
  cause: string;
  fix: string;
  href: string;
  linkLabel: string;
}

export const STORE_SCREEN_DIRECTORY: StoreScreenEntry[] = [
  {
    title: "Products & Variants",
    href: "/admin/store/products",
    whenToUse:
      "Create products, set Stocked / Preorder / Dropship, set prices, enable swimwear size charts, and toggle per-variant 'Continue selling when out of stock'.",
    badge: "Before purchase",
  },
  {
    title: "Procurement (POs & Goods Receipts)",
    href: "/admin/store/procurement",
    whenToUse:
      "Create & approve supplier Purchase Orders and record Goods Receipts when stock arrives (tracks real unit landed cost & COGS automatically).",
    badge: "Receiving stock",
  },
  {
    title: "Inventory Counts",
    href: "/admin/store/inventory",
    whenToUse:
      "Inspect On-Hand vs. Reserved vs. Available counts, check low-stock alerts, or record a quick count adjustment (auto-allocates FIFO to waiting paid preorders).",
    badge: "Stock view",
  },
  {
    title: "Bank Transfer Reviews",
    href: "/admin/payments",
    whenToUse:
      "Verify manual bank-transfer receipts against the corporate bank statement and approve them with a bank reference so pending orders flip to Paid.",
    badge: "Payment proof",
  },
  {
    title: "Orders Queue",
    href: "/admin/store/orders",
    whenToUse:
      "Move Paid orders through Processing → Ready for Pickup → Picked Up (for pickups) or Processing → Shipped → Delivered (for deliveries).",
    badge: "Daily fulfillment",
  },
  {
    title: "Returns & Cases",
    href: "/admin/store/cases",
    whenToUse:
      "Review customer cancellation requests, 7-day returns/exchanges, and defect claims (1-business-day target), and log return inspection condition.",
    badge: "Post-purchase",
  },
  {
    title: "Refunds & Payouts",
    href: "/admin/payments?tab=refunds",
    whenToUse:
      "Track Paystack API refunds (auto-initiated), verify customer NUBANs for bank-transfer refunds, and record verified corporate bank payout references.",
    badge: "Refund payouts",
  },
];

export const SOURCING_PLAYBOOKS: Record<SourcingKey, SourcingPlaybook> = {
  stocked: {
    key: "stocked",
    label: "Stocked",
    tagline: "Goods are physically sitting at SwimBuddz ready for immediate pickup or Lagos delivery.",
    accentClass: "border-emerald-200 bg-emerald-50/50",
    badgeClass: "bg-emerald-100 text-emerald-800",
    beforePurchase: [
      {
        step: "Set Sourcing Type to Stocked",
        detail:
          "Open the product in Products → Edit and set Sourcing Type = Stocked. For swimwear, turn on Size Chart Acknowledgment.",
        href: "/admin/store/products",
        linkLabel: "Open Products",
      },
      {
        step: "Receive physical stock (recommended: via Procurement)",
        detail:
          "Record a Purchase Order → Goods Receipt in Procurement so SwimBuddz tracks real acquisition cost & COGS. For quick counts without cost yet, use Inventory → Adjust (Finance flags it as unvalued until cost is entered).",
        href: "/admin/store/procurement",
        linkLabel: "Open Procurement",
      },
      {
        step: "Optional: Enable per-variant 'Continue selling when out of stock'",
        detail:
          "If some colours are in stock (e.g. Blue: 5) and others are 0, out-of-stock colours stay blocked with a diagonal slash by default. Turn on 'Continue selling when out of stock' per variant (or Enable all) in Products → Edit → Variants if you want customers to pre-order 0-stock colours.",
        href: "/admin/store/products",
        linkLabel: "Manage Variants",
      },
    ],
    afterPurchase: [
      {
        step: "Confirm order is Paid",
        detail:
          "Paystack, Bubbles, and Store Credit orders flip to Paid automatically (and reserve stock immediately at checkout). For Bank Transfers, approve the transfer in Admin → Payments first.",
        href: "/admin/payments",
        linkLabel: "Bank Transfer Reviews",
      },
      {
        step: "Pack & notify the customer",
        detail:
          "In Orders, move Paid → Processing. For Pickup orders, move to Ready for Pickup (notifies customer). For Delivery orders, open Order Detail, add tracking number, and mark Shipped.",
        href: "/admin/store/orders",
        linkLabel: "Open Orders",
      },
      {
        step: "Complete handover (stock deducts here!)",
        detail:
          "Only when the customer actually collects the item (Picked Up) or receives delivery (Delivered) do physical On-Hand and Reserved counts both drop by the quantity and COGS posts to Finance.",
        href: "/admin/store/orders",
        linkLabel: "Open Orders",
      },
    ],
    stockRule:
      "Checkout reserves stock (Reserved +qty, Available drops) without dropping On-Hand. Physical On-Hand deducts once on Picked Up or Delivered.",
  },
  preorder: {
    key: "preorder",
    label: "Preorder / Backorder",
    tagline:
      "Customer pays upfront at 0 stock → SwimBuddz orders the supplier batch → receives it → hands it over.",
    accentClass: "border-amber-200 bg-amber-50/50",
    badgeClass: "bg-amber-100 text-amber-800",
    beforePurchase: [
      {
        step: "Set Sourcing Type to Preorder (or enable per-variant Backorder)",
        detail:
          "Set Sourcing Type = Preorder and fill in Lead Days (e.g. 14 or 21 days) so the storefront clearly shows 'Pre-order Now' and the expected timeline.",
        href: "/admin/store/products",
        linkLabel: "Open Products",
      },
      {
        step: "Leave warehouse stock at 0 until the batch arrives",
        detail:
          "Customers can check out cleanly at 0 stock. Paid preorder orders enter the FIFO queue automatically without creating negative inventory.",
      },
    ],
    afterPurchase: [
      {
        step: "Verify payment & order from supplier",
        detail:
          "Approve manual bank transfers in Admin → Payments if applicable. Then place your supplier Purchase Order in Procurement for the batch (either exact preorder demand or extra units to stock).",
        href: "/admin/store/procurement",
        linkLabel: "Open Procurement",
      },
      {
        step: "Receive the batch when it lands (FIFO auto-reserves!)",
        detail:
          "Record the Goods Receipt in Procurement (preferred — tracks COGS) or add stock in Inventory. The system automatically reserves arriving units FIFO for your oldest paid preorders first; only leftover units go live for new storefront buyers.",
        href: "/admin/store/inventory",
        linkLabel: "Open Inventory",
      },
      {
        step: "Fulfill & hand over (strict receipt rule)",
        detail:
          "Move the order through Processing → Ready for Pickup / Shipped → Picked Up / Delivered. Handover strictly requires received stock on hand (409 otherwise) so stock and COGS are never untracked.",
        href: "/admin/store/orders",
        linkLabel: "Open Orders",
      },
    ],
    stockRule:
      "Strict Option A rule: You MUST record stock arrival (Procurement Goods Receipt or Inventory Restock) before clicking Picked Up or Delivered. Arriving stock auto-reserves FIFO for paid preorders first.",
  },
  dropship: {
    key: "dropship",
    label: "Dropship",
    tagline: "Supplier ships directly to the customer — stock never enters SwimBuddz's hands.",
    accentClass: "border-sky-200 bg-sky-50/50",
    badgeClass: "bg-sky-100 text-sky-800",
    beforePurchase: [
      {
        step: "Set Sourcing Type to Dropship & link Supplier",
        detail:
          "In Products → Edit, select Sourcing Type = Dropship and attach the Supplier. Keep warehouse stock at 0.",
        href: "/admin/store/products",
        linkLabel: "Open Products",
      },
    ],
    afterPurchase: [
      {
        step: "Verify payment & forward order to supplier",
        detail:
          "Once Paid, send the order details to the linked supplier and move the order to Processing.",
        href: "/admin/store/orders",
        linkLabel: "Open Orders",
      },
      {
        step: "Track dispatch & mark Delivered",
        detail:
          "Add supplier tracking on the Order Detail page, mark Shipped, then mark Delivered once confirmed. Warehouse stock is never touched.",
        href: "/admin/store/orders",
        linkLabel: "Open Orders",
      },
      {
        step: "Reconcile supplier cost in Finance",
        detail:
          "Delivering a dropship line automatically logs an unvalued cost marker for Finance until you match the supplier invoice/payout in Procurement & Treasury.",
        href: "/admin/store/procurement",
        linkLabel: "Open Procurement",
      },
    ],
    stockRule:
      "Dropship never claims or deducts warehouse stock; Finance tracks cost via supplier invoices and payouts.",
  },
};

export const TROUBLESHOOTING_ITEMS: TroubleshootingRow[] = [
  {
    symptom: "\"Cannot fulfill preorder item … insufficient stock received on hand\" (409)",
    cause:
      "You tried to click Picked Up or Delivered on a preorder/backorder before receiving the supplier batch into SwimBuddz inventory.",
    fix: "Record a Purchase Order Goods Receipt in Procurement (best — tracks cost) or add the received units in Inventory. Stock auto-reserves FIFO for the paid order, and handover will immediately succeed.",
    href: "/admin/store/procurement",
    linkLabel: "Receive Stock →",
  },
  {
    symptom: "\"Verify payment through the payment review workflow before marking an order paid\" (409)",
    cause:
      "An order is still Pending Payment (usually an unverified bank transfer) and someone tried to force it to Paid or Processing from Store.",
    fix: "Confirm actual credit in the corporate bank statement, then approve the transfer in Admin → Payments → Bank Transfer Reviews.",
    href: "/admin/payments",
    linkLabel: "Review Transfers →",
  },
  {
    symptom: "\"Paid orders cannot be cancelled through the raw status selector\" (409)",
    cause:
      "Paid orders cannot be silently cancelled in the status dropdown because stock, Bubbles, Store Credit, and cash refunds must all be reconciled.",
    fix: "Open the Order Detail page and click 'Cancel & Issue Refund', or approve the customer's cancellation case in Returns & Cases.",
    href: "/admin/store/cases",
    linkLabel: "Open Returns & Cases →",
  },
  {
    symptom: "Out-of-stock colour swatches are dimmed with a diagonal slash and can't be bought",
    cause:
      "The product is Stocked and those colour variants have 0 available stock with 'Continue selling when out of stock' turned off (the safe default).",
    fix: "Either restock those colours in Procurement / Inventory, or turn on 'Continue selling when out of stock (pre-order)' per variant in Products → Edit → Variants.",
    href: "/admin/store/products",
    linkLabel: "Edit Product Variants →",
  },
];
