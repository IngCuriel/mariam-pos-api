import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Obtener todas las ventas
export const getSales = async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { id: "desc" },
      include: { details: true },
    });
    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo ventas' });
  }
};

// Crear una venta
export const createSale = async (req, res) => {
  try {
    const { folio, total, status, paymentMethod, details } = req.body;
    const sale = await prisma.sale.create({
      data: {
        folio,
        total,
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
       include: { details: true }
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
        const {id, folio, branchId, total, status , paymentMethod,createdAt,clientName, syncStatus, details } = sale;
 
        const createdSale = await tx.sale.create({
          data: {
            folio,
            branchId:'PAPELERIA'+id ,
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