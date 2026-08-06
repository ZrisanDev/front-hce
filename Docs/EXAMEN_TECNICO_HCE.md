# **<u>EXAMEN TÉCNICO - ESPECIALISTA DESARROLLO HCE</u>**

La presente prueba técnica evalúa los requisitos de arquitectura, desarrollo y seguridad necesarios para el puesto de Especialista de Desarrollo TI - HCE. La solución se divide en dos secciones principales: BackEnd (NestJS) + FrontEnd (Next.js/React).

## **1.1. BackEnd - Microservicios y Gestión de Insumos Médicos HCE**

Diseñar un proyecto BackEnd API Rest utilizando la tecnología NestJS (Node.js), contenedorizado con Docker y basado en una arquitectura de Microservicios.

- **Seguridad:** Implementar obligatoriamente la autenticación mediante tokens de acceso JWT con una duración estricta de 30 minutos.

- **Base de Datos Relacional:** Se debe simular el modelo de datos para el control de medicamentos/insumos en las atenciones médicas:

## **Modelo de Entidades (Tablas de BD):**

## **● Productos**

Id_producto Nombre_producto NroLote Fec_registro Costo PrecioVenta

- **CompraCab**

Id_CompraCab FecRegistro SubTotal Igv Total

- **CompraDet**

Id_CompraDet Id_CompraCab Id_producto Cantidad Precio Sub_Total Igv Total

- **Ventacab**

Id_VentaCab fecRegistro SubTotal Igv Total

- **VentaDet**

Id_VentaDet Id_VentaCab

Id_producto Cantidad Precio Sub_Total Igv Total

## **● MovimientoCab**

Id_MovimientoCab Fec_registro Id_TipoMovimiento   => (1) Entrada , (2) Salida

Id_DocumentoOrigen=> (Id_CompraCab/Id_VentaCab; Depende del tipo MOV)

## **● Movimientodet**

Id_MovimientoDet Id_movimientocab Id_Producto Cantidad

# **1.1.1. Incluya los siguientes servicios para su solución:**

   - Registrar Venta.

   - Registrar Compra.

   - Registrar Producto.

   - Actualizar Producto.

   - Listar Venta.

   - Listar Compra.

   - Listar Producto.

   - Listar Kardex.

- Incluir los scripts de BD (insertar, listar, actualizar, eliminar) para el backend.

- Utilizar un documentador para su servicio Rest. Ejemplo: Swagger

- Incluir los collection para probar su Api Rest (PostMan - Insomnia - etc).

- Configurar CORS para el Api Rest creado y puede permitir ser consumido solo por el Front que se va crear.

- Utilizar patrones de diseño (Facade, Decorator).

- Utilizar principios SOLID.
## **1.1. BackEnd - Microservicios y Gestión de Insumos Médicos HCE**

Diseñar un proyecto BackEnd API Rest utilizando la tecnología NestJS (Node.js), contenedorizado con Docker y basado en una arquitectura de Microservicios.

- **Seguridad:** Implementar obligatoriamente la autenticación mediante tokens de acceso JWT con una duración estricta de 30 minutos.

- **Base de Datos Relacional:** Se debe simular el modelo de datos para el control de medicamentos/insumos en las atenciones médicas:

## **Modelo de Entidades (Tablas de BD):**

## **● Productos**

Id_producto Nombre_producto NroLote Fec_registro Costo PrecioVenta

- **CompraCab**

Id_CompraCab FecRegistro SubTotal Igv Total

- **CompraDet**

Id_CompraDet Id_CompraCab Id_producto Cantidad Precio Sub_Total Igv Total

- **Ventacab**

Id_VentaCab fecRegistro SubTotal Igv Total

- **VentaDet**

Id_VentaDet Id_VentaCab

Id_producto Cantidad Precio Sub_Total Igv Total

## **● MovimientoCab**

Id_MovimientoCab Fec_registro Id_TipoMovimiento   => (1) Entrada , (2) Salida

Id_DocumentoOrigen=> (Id_CompraCab/Id_VentaCab; Depende del tipo MOV)

## **● Movimientodet**

Id_MovimientoDet Id_movimientocab Id_Producto Cantidad

# **1.1.1. Incluya los siguientes servicios para su solución:**

   - Registrar Venta.

   - Registrar Compra.

   - Registrar Producto.

   - Actualizar Producto.

   - Listar Venta.

   - Listar Compra.

   - Listar Producto.

   - Listar Kardex.

- Incluir los scripts de BD (insertar, listar, actualizar, eliminar) para el backend.

- Utilizar un documentador para su servicio Rest. Ejemplo: Swagger

- Incluir los collection para probar su Api Rest (PostMan - Insomnia - etc).

- Configurar CORS para el Api Rest creado y puede permitir ser consumido solo por el Front que se va crear.
