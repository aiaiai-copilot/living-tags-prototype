---
name: shadcn-ui
description: Add shadcn/ui components to the frontend project with proper configuration and usage examples
---

# shadcn/ui Component Integration Skill

This skill helps you add and configure shadcn/ui components to the frontend.

## Usage

Invoke this skill when you need to:
- Add a new shadcn/ui component
- Configure shadcn/ui for the first time
- Understand how to use specific shadcn/ui components
- Fix shadcn/ui configuration issues

## Installation Steps

### 1. Initial Setup (First Time Only)

```bash
cd frontend
npx shadcn-ui@latest init
```

Answer the prompts:
- TypeScript: Yes
- Style: Default
- Base color: Slate
- CSS variables: Yes
- Tailwind config: Yes
- Components location: src/components/ui
- Utils location: src/lib/utils
- React Server Components: No
- Write config: Yes

### 2. Add Specific Components

```bash
cd frontend
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add form
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
```

## Common Components for This Project

### Button
```bash
npx shadcn-ui@latest add button
```

Usage:
```typescript
import { Button } from '@/components/ui/button';

<Button variant="default" size="lg">Pay via SBP</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Back</Button>
```

### Card
```bash
npx shadcn-ui@latest add card
```

Usage:
```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Payment</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content here */}
  </CardContent>
</Card>
```

### Input + Label
```bash
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
```

Usage:
```typescript
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="amount">Amount (₽)</Label>
  <Input
    id="amount"
    type="number"
    placeholder="100"
    {...register('amount')}
  />
</div>
```

### Form (with React Hook Form + Zod)
```bash
npx shadcn-ui@latest add form
```

Usage:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
});

function PaymentForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: 0 },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Alert
```bash
npx shadcn-ui@latest add alert
```

Usage:
```typescript
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Payment failed. Please try again.</AlertDescription>
</Alert>

<Alert variant="default">
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>Payment completed successfully!</AlertDescription>
</Alert>
```

### Toast (for notifications)
```bash
npx shadcn-ui@latest add toast
```

Usage:
```typescript
import { useToast } from '@/components/ui/use-toast';

function Component() {
  const { toast } = useToast();

  const notify = () => {
    toast({
      title: "Payment Created",
      description: "Scan QR code to complete payment",
    });
  };

  return <Button onClick={notify}>Notify</Button>;
}
```

## Theming for This Project

Update `tailwind.config.js` to match project colors:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(142, 76%, 36%)', // green-600
          foreground: 'hsl(0, 0%, 100%)',
        },
      },
    },
  },
};
```

## Component Customization

All shadcn/ui components can be customized. They're added to your project, not imported from a package.

Location: `frontend/src/components/ui/`

You can modify these files directly to match your design requirements.

## Testing shadcn/ui Components

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

test('renders button', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

## Common Issues

### TypeScript errors with paths
Make sure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Vite config for @ alias
Make sure `vite.config.ts` has:
```typescript
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Best Practices

1. **Use shadcn/ui components exclusively** - Don't create custom UI primitives
2. **Compose complex components** - Build feature components using shadcn/ui primitives
3. **Maintain accessibility** - shadcn/ui components are accessible by default
4. **Customize via Tailwind** - Use Tailwind classes for styling
5. **Keep variants consistent** - Use the same variants across the app

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Component Examples](https://ui.shadcn.com/examples)
- [Theme Customization](https://ui.shadcn.com/themes)

When adding components, always test them to ensure they work correctly with your project configuration.
