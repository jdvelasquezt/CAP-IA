import cds from '@sap/cds';
// import { SELECT } from '@sap/cds/lib/ql/cds-ql';

export default class CatalogService extends cds.ApplicationService {

    async init() {

        this.before('CREATE', 'SalesOrderItems', async (req) => {

            if (req.data.quantity <= 0) {
                return req.reject(400, 'La cantidad debe ser mayor que cero');
            }

            if (req.data.quantity > 100) {
                return req.reject(400, 'La cantidad no puede ser superior a 100');
            }

            if (req.data.unitPrice <= 0) {
                return req.reject(400, 'El unitPrice no puede ser menor o igual a cero');
            }

            req.data.netAmount = req.data.quantity * req.data.unitPrice;
        });


        this.after('CREATE', 'SalesOrderItems', async (data, req) => {

            console.log('--- AFTER CREATE ---');
            console.log('req.data:', req.data);

            const parentId = req.data.parent_id;

            console.log('parentId:', parentId);

            const tx = cds.tx(req);

            const result = await tx.run(
                SELECT.one
                    .from('zcap.SalesOrderItems')
                    .columns('sum(netAmount) as totalAmount')
                    .where({ parent_id: parentId })
            );

            console.log('SUM result:', result);

            const updateResult = await tx.run(
                UPDATE('zcap.SalesOrders')
                    .set({
                        totalAmount: result?.totalAmount ?? 0
                    })
                    .where({ id: parentId })
            );

            console.log('UPDATE result:', updateResult);
        });


        this.before('UPDATE', 'SalesOrders', async (req) => {
            const id = req.params?.[0]?.id ?? req.data.id;

            if (req.data.status === undefined || !id) {
                return;
            }

            const tx = cds.tx(req);

            const currentOrder = await tx.run(
                SELECT.one
                    .from('zcap.SalesOrders')
                    .columns('id', 'status')
                    .where({ id })
            );

            if (!currentOrder) {
                return req.reject(404, 'La SalesOrder no existe');
            }

            const currentStatus = currentOrder.status?.toUpperCase();
            const requestedStatus = req.data.status?.toUpperCase();

            if (currentStatus === 'CLOSED' && requestedStatus !== 'CLOSED') {
                return req.reject(
                    400,
                    'No se puede reabrir una SalesOrder que ya está cerrada'
                );
            }
        });


        //CONSULTA POR SELECT (NO ESTANDAR)
        // this.on('READ', 'Products', async (req, next) => {

        //     const currentProduct = await
        //         SELECT
        //             .from('zcap.Products')
        //             .where({ price: { '>': 1000 } });

        //     return currentProduct;
        // });

        // NEXT PROCESAMIENTO SAP ESTANDAR DE CONSULTA
        // this.on('READ', 'Products', async (req, next) => {

        //     const result = await next(); // READ ESTANDAR A TODOS LOS PRODUCTOS

        //     const filtered = result.filter(product => product.price > 1000); // EVALUA REGISTRO POR REGISTRO 

        //     return filtered; // DEVUELVE REGISTROS PRECIO MAYOR A 1000
        // });

        // this.on('READ', 'Products', async (req, next) => {

        //     console.log('QUERY:', req.query);

        //     const result = await next();

        //     return result;
        // });


        // this.on('READ', 'Products', async (req, next) => {

        //     const query = SELECT.from('zcap.Products');

        //     // Conservar los filtros enviados por OData.
        //     if (req.query.SELECT.where) {
        //         query.where(req.query.SELECT.where);
        //     }

        //     // Ordenar por precio descendente.
        //     query.orderBy({ price: 'desc' });

        //     // Limitar el resultado a dos registros.
        //     query.limit(2);

        //     return cds.tx(req).run(query);
        // });

        this.on('close', 'SalesOrders', async (req) => {
            const reason = req.data.reason;

            console.log('Motivo de cierre:', reason);

            if (!req.data.reason?.trim()) {
                return req.reject(
                    400,
                    'Debe indicar un motivo para cerrar la SalesOrder'
                );
            }

            // 1. Obtener el ID de la SalesOrder
            // --------------------------------------------------
            const id = req.params[0].id;

            console.log('ID de la orden:', id);

            // 2. Buscar la SalesOrder
            // --------------------------------------------------
            const tx = cds.tx(req);

            const order = await tx.run(
                SELECT.one
                    .from('zcap.SalesOrders')
                    .columns('id', 'status', 'orderNumber')
                    .where({ id: id })
            );

            console.log('Orden encontrada:', order);

            // 3. Verificar que la orden exista
            // --------------------------------------------------
            if (!order) {
                return req.reject(
                    404,
                    'La SalesOrder no existe'
                );
            }

            // 4. Verificar que la orden esté OPEN
            // --------------------------------------------------
            if (order.status === 'CLOSED') {
                return req.reject(
                    400,
                    'La SalesOrder ya está cerrada'
                );
            }

            // 5. Buscar los items de la orden
            // --------------------------------------------------
            const items = await tx.run(
                SELECT
                    .from('zcap.SalesOrderItems')
                    .where({ parent_id: id })
            );

            console.log('Items encontrados:', items);

            // 6. Verificar que tenga al menos un item
            // --------------------------------------------------
            if (items.length === 0) {
                return req.reject(
                    400,
                    'No se puede cerrar una SalesOrder sin items'
                );
            }

            // 7. Cambiar OPEN → CLOSED
            // --------------------------------------------------
            await tx.run(
                UPDATE('zcap.SalesOrders')
                    .set({
                        status: 'CLOSED'
                    })
                    .where({ id: id })
            );

            // 8. Responder al consumidor OData
            // --------------------------------------------------
            return {
                success: true,
                orderNumber: order.orderNumber,
                status: 'CLOSED',
                message: 'SalesOrder cerrada correctamente'
            };
        });

        this.on('getOpenOrders', async (req) => {

            const tx = cds.tx(req);

            return tx.run(
                SELECT.from('CatalogService.SalesOrders')
                    .where({ status: 'OPEN' })
                    .orderBy({ orderDate: 'desc' })
            );

        });

        await super.init();
    }
}