using { zcap } from '../db/schema';

type CloseOrderResult {
    success     : Boolean;
    orderNumber : String;
    status      : String;
    message     : String;
}

@requires: 'authenticated-user'
service CatalogService {
    function getOpenOrders() returns many SalesOrders;
// @readonly
    @restrict: [
        { grant: 'READ', to: ['Viewer', 'SalesManager', 'Admin'] },
        { grant: ['CREATE', 'UPDATE', 'DELETE'], to: 'Admin' }
    ]
    entity Products as projection on zcap.Products {
        id,
        productCode,
        description,
        price,
        currency
    };

    @restrict: [
        { grant: 'READ', to: ['Viewer', 'SalesManager', 'Admin'] },
        { grant: ['CREATE', 'UPDATE', 'DELETE'], to: 'Admin' }
    ]
    entity Customers as projection on zcap.Customers;

    @restrict: [
        // { grant: 'READ', to: ['Viewer', 'SalesManager', 'Admin', 'DEFAULT_USER', 'ernasz', 'Default User'] },
        { grant: 'READ' },
        { grant: ['CREATE', 'UPDATE'], to: ['SalesManager', 'Admin'] },
        { grant: 'DELETE', to: 'Admin' },
        { grant: 'close', to: ['SalesManager', 'Admin'] }
    ]
    @UI.LineItem: [
    { Value: orderNumber },
    { Value: orderDate },
    { Value: status },
    { Value: totalAmount }
]
@UI.SelectionFields: [status, orderDate]
    entity SalesOrders as projection on zcap.SalesOrders
        actions {
            action close(reason: String) returns CloseOrderResult;
            
        };

    @restrict: [
        { grant: 'READ', to: ['Viewer', 'SalesManager', 'Admin'] },
        { grant: ['CREATE', 'UPDATE'], to: ['SalesManager', 'Admin'] },
        { grant: 'DELETE', to: 'Admin' }
    ]
    entity SalesOrderItems as projection on zcap.SalesOrderItems;
}
