# @trellisflow/shared

Types, enums, DTOs, and constants shared by `@trellisflow/api` and `@trellisflow/web`.

## Purpose

The frontend and backend must agree on the shape of data. Defining DTOs and enums
here means they can never drift. One change here propagates to both apps.

## Structure

- `src/enums/` — fixed enumerations (TransactionType, AssetClass, etc.)
- `src/dtos/` — data transfer objects (added as features are built)
- `src/constants/` — shared constants (limits, API paths)
- `src/types/` — utility types (added as needed)

## Usage

```typescript
import { TransactionType, ContainerType } from '@trellisflow/shared';
```
