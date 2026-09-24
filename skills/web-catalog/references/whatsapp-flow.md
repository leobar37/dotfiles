# WhatsApp Checkout Flow

Replacing Stripe/payment processors with WhatsApp as the conversion channel.

## Core Concept

1. User browses catalog (from AI chatbot or direct)
2. User adds items to cart
3. On checkout, instead of payment form → open WhatsApp with order details
4. Order is created in Payload CMS as "pending"
5. User sends WhatsApp message with order
6. Staff processes order manually via WhatsApp

## WhatsApp Adapter (`src/lib/whatsapp.ts`)

```typescript
export interface WhatsAppOrderItem {
  title: string;
  quantity: number;
  price: number;
  currency: string;
}

export interface WhatsAppCheckoutData {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: WhatsAppOrderItem[];
  total: number;
  currency: string;
  orderNotes?: string;
}

export const generateOrderMessage = (data: WhatsAppCheckoutData): string => {
  const itemsList = data.items
    .map(item => `• ${item.title} x${item.quantity} - ${formatPrice(item.price, item.currency)}`)
    .join("\n");

  return `
🛒 *Nuevo Pedido*

*Datos del Cliente:*
👤 Nombre: ${data.customerName}
${data.customerPhone ? `📱 Teléfono: ${data.customerPhone}` : ""}
${data.customerEmail ? `📧 Email: ${data.customerEmail}` : ""}

*Detalle del Pedido:*
${itemsList}

*Total: ${formatPrice(data.total, data.currency)}*

${data.orderNotes ? `📝 Notas: ${data.orderNotes}` : ""}

---
Enviado desde mi-sitio.com
`.trim();
};

export const generateWhatsAppURL = (
  phoneNumber: string,
  data: WhatsAppCheckoutData
): string => {
  const message = generateOrderMessage(data);
  const encoded = encodeURIComponent(message);
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
};

export const initiateWhatsAppCheckout = (
  phoneNumber: string,
  data: WhatsAppCheckoutData
): void => {
  window.open(generateWhatsAppURL(phoneNumber, data), "_blank");
};
```

## Cart to WhatsApp Conversion

```typescript
import { processCartForWhatsApp, initiateWhatsAppCheckout } from "@/lib/whatsapp";

const handleCheckout = () => {
  const checkoutData = processCartForWhatsApp(
    cartItems,                    // Array of { product, quantity }
    { name: customerName, phone: customerPhone, email: customerEmail },
    orderNotes
  );

  // Create pending order in Payload
  createOrder({
    items: cartItems.map(item => ({
      product: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
    })),
    total: checkoutData.total,
    customerInfo: { name: customerName, phone: customerPhone, email: customerEmail },
  });

  // Open WhatsApp
  initiateWhatsAppCheckout("+51994514111", checkoutData);
};
```

## AI Tool Integration

The `scheduleConsultationTool` generates WhatsApp links:

```typescript
execute: async ({ name, phone, email, surgeryInterest, message }) => {
  // Create consultation request as order
  const order = await createOrder({ ... });

  const whatsappMessage = `¡Hola! Me gustaría agendar una consulta con el Dr. Yurivilca.
  
*Nombre:* ${name}
*Teléfono:* ${phone}
${surgeryInterest ? `*Cirugía de interés:* ${surgeryInterest}` : ""}
${message ? `*Mensaje:* ${message}` : ""}`;

  return {
    success: true,
    orderId: order.id,
    whatsappLink: `https://wa.me/${PHONE}?text=${encodeURIComponent(whatsappMessage)}`,
    message: "Su solicitud ha sido recibida. Un miembro de nuestro equipo se comunicará con usted pronto.",
  };
}
```

## Phone Number Format

Store in `siteConfig`:

```typescript
export const siteConfig = {
  contact: {
    whatsapp: {
      primary: "+51994514111",   // With + prefix
      secondary: "+51932179534",
    },
  },
};

// When generating URL - remove + prefix
const waLink = `https://wa.me/${phone.replace("+", "")}?text=...`;
```

## WhatsApp Button Component

```tsx
const WhatsAppButton = ({ phoneNumber, message }: { phoneNumber: string; message: string }) => (
  <Button onClick={() => {
    const url = `https://wa.me/${phoneNumber.replace("+", "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }}>
    <MessageCircle className="h-4 w-4" />
    Contactar por WhatsApp
  </Button>
);
```

## Benefits over Stripe

| Aspect | Stripe | WhatsApp |
|--------|--------|----------|
| Setup complexity | High (merchant account, keys, webhooks) | Low (just phone number) |
| Transaction fees | 2-3% per transaction | None |
| Payment methods | Credit cards only | Any payment user chooses |
| Customer relationship | Anonymous | Direct conversation |
| Cart abandonment | High | Lower (direct contact) |
| Manual order fulfill | No | Yes (staff responds) |

## Best for

- Small businesses without merchant accounts
- High-touch sales that need conversation
- Markets where WhatsApp is dominant (LatAm, Europe, India)
- B2B or high-consideration purchases
