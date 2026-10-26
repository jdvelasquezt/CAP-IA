namespace zcap;

using {
    cuid,
    managed
} from '@sap/cds/common';

type CurrencyCode : String(3);

entity Products : managed {
    key id          : UUID;
        productCode : String;
        description : String;
        price       : Decimal(12, 2);
        currency    : CurrencyCode;
}

entity Customers : cuid, managed {
    businessPartner : String;
    name            : String;
    country         : String;
}

entity SalesOrders : managed {
    key id          : UUID;
        @mandatory
        @Common.Label: 'Número de pedido'
        orderNumber : String;
        @Common.Label: 'Fecha del pedido'
        orderDate   : Date;
        @Common.Label: 'Estado'
        status      : String(20);
        @Common.Label: 'Importe total'
        totalAmount : Decimal(12, 2);
        @Common.Label: 'Precio'
        price       : String;
        @Common.Label: 'Moneda'
        currency    : String;
        items       : Composition of many SalesOrderItems
                          on items.parent = $self;
        customer    : Association to Customers
}

entity SalesOrderItems : cuid, managed {
    // key id        : UUID;
        parent    : Association to SalesOrders;
        product   : Association to Products;
        @assert.range: [1, 100]
        quantity  : Integer;
        unitPrice : Decimal(12, 2);
        netAmount : Decimal(12, 2);
}
