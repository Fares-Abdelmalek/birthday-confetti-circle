import { toast } from "sonner";

export const SHOPIFY_API_VERSION = "2025-07";
export const SHOPIFY_STORE_PERMANENT_DOMAIN = "birthday-confetti-circle-y9q4p-fad9s4p3.myshopify.com";
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = "3d0b46bb880f6d6ab32ef06a478da47d";

export type Money = { amount: string; currencyCode: string };

export interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    productType: string;
    priceRange: { minVariantPrice: Money };
    images: { edges: Array<{ node: { url: string; altText: string | null } }> };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: Money;
          availableForSale: boolean;
          selectedOptions: Array<{ name: string; value: string }>;
        };
      }>;
    };
  };
}

const PRODUCT_FIELDS = `
  id title description handle productType
  priceRange { minVariantPrice { amount currencyCode } }
  images(first: 3) { edges { node { url altText } } }
  variants(first: 10) { edges { node { id title price { amount currencyCode } availableForSale selectedOptions { name value } } } }
`;

export const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) { edges { node { ${PRODUCT_FIELDS} } } }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `
  query GetProduct($handle: String!) { product(handle: $handle) { ${PRODUCT_FIELDS} } }
`;

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { id checkoutUrl }
      userErrors { field message }
    }
  }
`;

const CART_QUERY = `query cart($id: ID!) { cart(id: $id) { id totalQuantity } }`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function storefrontApiRequest(query: string, variables: Record<string, unknown> = {}): Promise<any> {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (response.status === 402) {
    toast.error("Shopify: Payment required", {
      description: "Shopify needs an active plan on this store before it can sell.",
    });
    return undefined;
  }
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  if (data.errors) {
    throw new Error(
      `Error calling Shopify: ${data.errors.map((e: { message: string }) => e.message).join(", ")}`,
    );
  }
  return data;
}

export async function fetchProducts(first = 50): Promise<ShopifyProduct[]> {
  const data = await storefrontApiRequest(PRODUCTS_QUERY, { first });
  return data?.data?.products?.edges ?? [];
}

export async function fetchProduct(handle: string): Promise<ShopifyProduct["node"] | null> {
  const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
  return data?.data?.product ?? null;
}

function formatCheckoutUrl(checkoutUrl: string) {
  try {
    const url = new URL(checkoutUrl);
    url.searchParams.set("channel", "online_store");
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}

/** Creates a real Shopify cart; Shopify's checkout collects the address and charges the card. */
export async function createShopifyCart(
  lines: Array<{ variantId: string; quantity: number }>,
  note: string,
  attributes: Array<{ key: string; value: string }>,
): Promise<{ cartId: string; checkoutUrl: string } | null> {
  const data = await storefrontApiRequest(CART_CREATE_MUTATION, {
    input: {
      lines: lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity })),
      note,
      attributes,
    },
  });
  const errs = data?.data?.cartCreate?.userErrors ?? [];
  if (errs.length) {
    console.error("Cart creation failed:", errs);
    return null;
  }
  const cart = data?.data?.cartCreate?.cart;
  if (!cart?.checkoutUrl) return null;
  return { cartId: cart.id, checkoutUrl: formatCheckoutUrl(cart.checkoutUrl) };
}

/** A Shopify cart disappears once its checkout is completed (paid). */
export async function isCartCompleted(cartId: string): Promise<boolean | null> {
  const data = await storefrontApiRequest(CART_QUERY, { id: cartId });
  if (!data) return null;
  return !data?.data?.cart;
}

export function formatMoney(amount: string | number, currencyCode: string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currencyCode}`;
}

export function categoryEmoji(type: string) {
  switch (type.toLowerCase()) {
    case "books":
      return "📚";
    case "toys":
      return "🧸";
    case "gadgets":
      return "🎧";
    case "home":
      return "🕯️";
    case "treats":
      return "🍫";
    default:
      return "🎁";
  }
}
