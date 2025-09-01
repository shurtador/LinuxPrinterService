# Printing Integration Specification
## Fields required per each type of receipt

### Cash Transfer Receipt Format
```typescript
interface CashTransferReceipt {
  transferId: string;
  date: string;
  shiftInfo?: string; // "Morning Shift" or "Afternoon Shift"
  senderName: string;
  receiverName: string;
  amount: number;
  notes?: string;
  locationName: string;
  printTime: string;
}
```

### Shift Closure Receipt Format
```typescript
interface ShiftClosureReceipt {
  shiftId: string;
  shiftType: string;
  shiftDate: string;
  cashierName: string;
  startTime: string;
  endTime: string;
  startingCash: number;
  endingCashExpected: number;
  endingCashCounted: number;
  variance: number;
  shiftSales: number;
  transfersOut: number;
  locationName: string;
  printTime: string;
}
```

### Shift Handoff Receipt Format
```typescript
interface ShiftHandoffReceipt {
  handoffId: string;
  handoffDate: string;
  outgoingCashier: string;
  incomingCashier: string;
  handoffAmount: number;
  verifiedAmount: number;
  variance: number;
  status: string;
  locationName: string;
  printTime: string;
}
```

### Cash Expense Receipt Format (New)
```typescript
interface CashExpenseReceipt {
  expenseId: string;
  cashExpenseId: string;
  date: string;
  cashierName: string;
  category: string;
  description: string;
  amount: number;
  shiftInfo: string;
  locationName: string;
  printTime: string;
}
```

## Print Payload Structures

### Cash Transfer Receipt
```typescript
const transferPrintPayload = {
  printer: "Rongta",
  receipt: {
    type: "cash_transfer",
    transferId: `TRANS-${String(transfer.id).padStart(6, '0')}`,
    date: transfer.transferDate,
    shiftInfo: transfer.shift ? `Turno ${transfer.shift.shiftType}` : undefined,
    senderName: transfer.senderUser.firstName + ' ' + transfer.senderUser.lastName,
    receiverName: transfer.receiverName,
    amount: Number(transfer.transferAmount),
    notes: transfer.notes,
    locationName: "Buñuelisimo - Location Name",
    printTime: new Date().toISOString()
  }
};
```

### Shift Closure Receipt
```typescript
const shiftClosurePrintPayload = {
  printer: "Rongta",
  receipt: {
    type: "shift_closure",
    shiftId: `SHIFT-${String(shift.id).padStart(6, '0')}`,
    shiftType: shift.shiftType,
    shiftDate: shift.shiftDate,
    cashierName: shift.cashierUser.firstName + ' ' + shift.cashierUser.lastName,
    startTime: shift.shiftStartTime,
    endTime: shift.shiftEndTime,
    startingCash: Number(shift.startingCashAmount),
    endingCashExpected: Number(shift.endingCashExpected),
    endingCashCounted: Number(shift.endingCashCounted),
    variance: Number(shift.cashVariance),
    shiftSales: Number(shift.shiftTotalSales),
    transfersOut: Number(shift.cashTransfersOut),
    locationName: "Buñuelisimo - Location Name",
    printTime: new Date().toISOString()
  }
};
```

### Shift Handoff Receipt
```typescript
const handoffPrintPayload = {
  printer: "Rongta",
  receipt: {
    type: "shift_handoff",
    handoffId: `HAND-${String(handoff.id).padStart(6, '0')}`,
    handoffDate: handoff.handoffDate,
    outgoingCashier: handoff.outgoingCashierUser.firstName + ' ' + handoff.outgoingCashierUser.lastName,
    incomingCashier: handoff.incomingCashierUser.firstName + ' ' + handoff.incomingCashierUser.lastName,
    handoffAmount: Number(handoff.handoffCashAmount),
    verifiedAmount: Number(handoff.verifiedCashAmount),
    variance: Number(handoff.handoffVariance),
    status: handoff.status.toUpperCase(),
    locationName: "Buñuelisimo - Location Name",
    printTime: new Date().toISOString()
  }
};
```

### Cash Expense Receipt
```typescript
const cashExpensePrintPayload = {
  printer: "Rongta",
  receipt: {
    type: "cash_expense",
    expenseId: `EXP-${String(expense.id).padStart(6, '0')}`,
    cashExpenseId: `CASH-${String(cashExpense.id).padStart(6, '0')}`,
    date: cashExpense.createdAt,
    cashierName: cashExpense.cashierUser.firstName + ' ' + cashExpense.cashierUser.lastName,
    category: formatCategory(cashExpense.category), // "Uso de Baño", "Alimentación", etc.
    description: cashExpense.description,
    amount: Number(cashExpense.amount),
    shiftInfo: `Turno ${cashExpense.shift.shiftType}`,
    locationName: "Buñuelisimo - Location Name",
    printTime: new Date().toISOString()
  }
};
```

## Direct Browser Printing Call
```typescript
// All receipt types use the same printing method
fetch('http://127.0.0.1:8080/print', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(printPayload)
});
```

## Receipt Layout Graphic Templates

### Cash Transfer Receipt
```
================================
        BUÑUELISIMO
     TRANSFER DE EFECTIVO
================================
Transfer #: TRANS-000123
Turno: Turno Mañana
Fecha: 2024-08-30 14:30:00
--------------------------------
Enviado por: [Sender Name]
Firma: ____________________

Recibido por: [Receiver Name]  
Firma: ____________________
--------------------------------
Monto Transferido:
                     $1,250,000
--------------------------------
Notas: [Transfer notes if any]
================================
     CONSERVAR PARA AUDITORIA
================================
```

### Shift Closure Receipt
```
================================
        BUÑUELISIMO
      CIERRE DE TURNO
================================
Turno #: SHIFT-000045
Tipo: Turno Tarde
Fecha: 2024-08-30
Hora: 14:00 - 22:00
--------------------------------
Cajero: [Cashier Name]
Inicio: $500,000
Ventas Turno: $850,000
Efectivo Esperado: $1,350,000
Efectivo Contado: $1,348,000
Variacion: -$2,000
--------------------------------
Transferencias: $800,000
Gastos de Caja: $35,000
  - Alimentación: $25,000
  - Uso de Baño: $10,000
Efectivo Final: $513,000
================================
      CIERRE COMPLETADO
================================
```

### Shift Handoff Receipt
```
================================
        BUÑUELISIMO
     ENTREGA DE TURNO
================================
Entrega #: HAND-000067
Fecha: 2024-08-30 14:00:00
--------------------------------
Sale: [Outgoing Cashier]
Firma: ____________________

Recibe: [Incoming Cashier]
Firma: ____________________
--------------------------------
Efectivo Entregado: $548,000
Efectivo Verificado: $548,000
Diferencia: $0
Estado: VERIFICADO
================================
     CONSERVAR PARA AUDITORIA
================================
```

### Cash Expense Receipt (New)
```
================================
        BUÑUELISIMO
      GASTO DE CAJA
================================
Gasto #: CASH-000089
Comprobante: EXP-000452
Turno: Turno Tarde
Fecha: 2024-08-30 16:45:00
--------------------------------
Cajero: [Cashier Name]
Categoría: Alimentación
Descripción: Almuerzo para personal
Monto: $25,000
--------------------------------
Firma Cajero: ________________
Fecha: ___________________
================================
     CONSERVAR PARA AUDITORIA
================================
```