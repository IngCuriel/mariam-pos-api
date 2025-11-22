import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Obtener todas las ventas con filtros opcionales
export const getSales = async (req, res) => {
  try {
    const { startDate, endDate, branch, paymentMethod } = req.query;
    
    // Ejecutar consulta - usar Prisma normal si no hay filtros de fecha
    let sales;
    if (startDate || endDate) {
      // Con filtros de fecha, usar consulta raw para zona horaria
      // Escapar valores de forma segura
      const escapedBranch = branch ? `'${branch.replace(/'/g, "''")}'` : 'NULL';
      const escapedPaymentMethod = paymentMethod ? `'${paymentMethod.replace(/'/g, "''")}'` : 'NULL';
      
      let conditions = [];
      if (startDate) {
        conditions.push(`(s."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date >= '${startDate}'::date`);
      }
      if (endDate) {
        conditions.push(`(s."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date <= '${endDate}'::date`);
      }
      if (branch) {
        conditions.push(`s.branch = ${escapedBranch}`);
      }
      if (paymentMethod) {
        conditions.push(`s."paymentMethod" = ${escapedPaymentMethod}`);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      const query = `
        SELECT 
          s.id,
          s.folio,
          s.total,
          s.status,
          s.branch,
          s."cashRegister",
          s."paymentMethod",
          s."createdAt",
          s."clientName",
          s."syncStatus",
          COALESCE(
            json_agg(
              json_build_object(
                'id', sd.id,
                'quantity', sd.quantity,
                'price', sd.price,
                'subTotal', sd."subTotal",
                'productName', sd."productName",
                'createdAt', sd."createdAt",
                'saleId', sd."saleId"
              )
            ) FILTER (WHERE sd.id IS NOT NULL),
            '[]'::json
          ) as details
        FROM "Sale" s
        LEFT JOIN "SaleDetail" sd ON sd."saleId" = s.id
        ${whereClause}
        GROUP BY s.id
        ORDER BY s.id DESC
      `;
      
      sales = await prisma.$queryRawUnsafe(query);
    } else {
      // Sin filtros de fecha, usar Prisma normal
      const where = {};
      if (branch) where.branch = branch;
      if (paymentMethod) where.paymentMethod = paymentMethod;
      
      sales = await prisma.sale.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { id: "desc" },
        include: { details: true },
      });
    }
    
    res.json(sales);
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    res.status(500).json({ error: 'Error obteniendo ventas' });
  }
};

// Crear una venta
export const createSale = async (req, res) => {
  try {
    const { folio, total, branch, cashRegister, status, paymentMethod, details } = req.body;
    const sale = await prisma.sale.create({
      data: {
        folio,
        total,
        branch, 
        cashRegister,
        status,
        paymentMethod,
        details: { create: details },
      },
      include: { details: true },
    });
    res.json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creando venta' });
  }
};

export const getSalesById = async (req, res) => {
  const { id } = req.params;
  const sale = await prisma.sale.findUnique({
    where: { id: parseInt(id) },
    include: {
       details: true
    },
  });
  res.json(sale);
};


export const createSalesWithDetails = async (req, res) => {
  try {
    const sales  = req.body;

    console.log('sales bulk' , sales);
    //console.log('req', req);
 
    if (!Array.isArray(sales) || sales.length === 0) {
      return res.status(400).json({ error: 'Debes enviar un arreglo de ventas válido' });
    }

    // Usamos una transacción global
    const result = await prisma.$transaction(async (tx) => {
      const createdSales = [];

      for (const sale of sales) {
        const {id, folio, branch, cashRegister, total, status , paymentMethod,createdAt,clientName, syncStatus, details } = sale;
 
        const createdSale = await tx.sale.create({
          data: {
            folio :'TK '+id,
            branch, 
            cashRegister,
            total,
            status,
            paymentMethod,
            createdAt,
            clientName,
            syncStatus: 'enviado',
            details: {
              create: details?.map((d) => ({
                quantity: d.quantity,
                price: d.price,
                subTotal: d.subTotal,
                productName: d.productName,
                createdAt: d.createdAt
              })),
            },
          },
          include: { details: true },
        });

        createdSales.push(createdSale);
      }

      return createdSales;
    });
    console.log('✅ Ventas creadas correctamente');
    res.status(200).json({ message: '✅ Ventas creadas correctamente', sales: result });
  } catch (error) {
    console.error('❌ Error en transacción de ventas:', error);
    res.status(500).json({ error: 'Error al crear las ventas' });
  }
};

// Obtener estadísticas generales
export const getSalesStats = async (req, res) => {
  try {
    const { startDate, endDate, branch } = req.query;
    
    // Construir condiciones WHERE con zona horaria
    let whereConditions = [];
    
    if (startDate) {
      whereConditions.push(
        `(s."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date >= '${startDate}'::date`
      );
    }
    
    if (endDate) {
      whereConditions.push(
        `(s."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date <= '${endDate}'::date`
      );
    }
    
    if (branch) {
      const escapedBranch = branch.replace(/'/g, "''");
      whereConditions.push(`s.branch = '${escapedBranch}'`);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // Usar consultas raw para aplicar filtros de zona horaria
    const [totalSalesResult, totalAmountResult, salesByBranchResult, salesByPaymentMethodResult, salesByDayResult] = await Promise.all([
      // Total de ventas
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "Sale" s ${whereClause}`
      ),
      
      // Monto total
      prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(s.total), 0) as sum FROM "Sale" s ${whereClause}`
      ),
      
      // Ventas por sucursal
      prisma.$queryRawUnsafe(
        `SELECT 
          s.branch,
          COUNT(*) as count,
          COALESCE(SUM(s.total), 0) as total
        FROM "Sale" s
        ${whereClause}
        GROUP BY s.branch`
      ),
      
      // Ventas por método de pago
      prisma.$queryRawUnsafe(
        `SELECT 
          s."paymentMethod",
          COUNT(*) as count,
          COALESCE(SUM(s.total), 0) as total
        FROM "Sale" s
        ${whereClause}
        GROUP BY s."paymentMethod"`
      ),
      
      // Ventas por día con zona horaria de México
      prisma.$queryRawUnsafe(
        `SELECT 
          (s."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date as date,
          COUNT(*) as count,
          COALESCE(SUM(s.total), 0) as total
        FROM "Sale" s
        ${whereClause}
        GROUP BY (s."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date
        ORDER BY date DESC
        LIMIT 30`
      ),
    ]);
    
    const totalSales = parseInt(totalSalesResult[0]?.count || 0);
    const totalAmount = parseFloat(totalAmountResult[0]?.sum || 0);
    
    const salesByBranch = salesByBranchResult.map((item) => ({
      branch: item.branch || 'Sin sucursal',
      count: parseInt(item.count),
      total: parseFloat(item.total),
    }));
    
    const salesByPaymentMethod = salesByPaymentMethodResult.map((item) => ({
      paymentMethod: item.paymentMethod || 'Sin método',
      count: parseInt(item.count),
      total: parseFloat(item.total),
    }));
    
    const salesByDay = salesByDayResult.map((item) => ({
      date: item.date.toISOString().split('T')[0],
      count: parseInt(item.count),
      total: parseFloat(item.total),
    }));
    
    res.json({
      totalSales,
      totalAmount,
      averageSale: totalSales > 0 ? totalAmount / totalSales : 0,
      byBranch: salesByBranch,
      byPaymentMethod: salesByPaymentMethod,
      byDay: salesByDay,
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
};

// Obtener estadísticas por sucursal
export const getBranchStats = async (req, res) => {
  try {
    const { branch } = req.params;
    const { startDate, endDate } = req.query;
    
    // Construir condiciones WHERE con zona horaria
    const escapedBranch = branch.replace(/'/g, "''");
    let whereConditions = [`s.branch = '${escapedBranch}'`];
    
    if (startDate) {
      whereConditions.push(
        `(s."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date >= '${startDate}'::date`
      );
    }
    
    if (endDate) {
      whereConditions.push(
        `(s."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date <= '${endDate}'::date`
      );
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // Usar consultas raw para aplicar filtros de zona horaria
    const [totalSalesResult, totalAmountResult, salesByPaymentMethodResult] = await Promise.all([
      // Total de ventas
      prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "Sale" s ${whereClause}`
      ),
      
      // Monto total
      prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(s.total), 0) as sum FROM "Sale" s ${whereClause}`
      ),
      
      // Ventas por método de pago
      prisma.$queryRawUnsafe(
        `SELECT 
          s."paymentMethod",
          COUNT(*) as count,
          COALESCE(SUM(s.total), 0) as total
        FROM "Sale" s
        ${whereClause}
        GROUP BY s."paymentMethod"`
      ),
    ]);
    
    const totalSales = parseInt(totalSalesResult[0]?.count || 0);
    const totalAmount = parseFloat(totalAmountResult[0]?.sum || 0);
    
    const salesByPaymentMethod = salesByPaymentMethodResult.map((item) => ({
      paymentMethod: item.paymentMethod || 'Sin método',
      count: parseInt(item.count),
      total: parseFloat(item.total),
    }));
    
    res.json({
      branch,
      totalSales,
      totalAmount,
      averageSale: totalSales > 0 ? totalAmount / totalSales : 0,
      byPaymentMethod: salesByPaymentMethod,
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de sucursal:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas de sucursal' });
  }
};