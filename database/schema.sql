--
-- PostgreSQL database dump
--

-- Dumped from database version 11.2
-- Dumped by pg_dump version 11.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: caja_ajustes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.caja_ajustes (
    id integer NOT NULL,
    caja_turno_id integer NOT NULL,
    tipo character varying(20) NOT NULL,
    monto numeric(10,2) NOT NULL,
    denominaciones jsonb DEFAULT '{}'::jsonb,
    motivo text NOT NULL,
    usuario_id integer,
    autorizador_id integer,
    empresa_id integer NOT NULL,
    fecha timestamp without time zone DEFAULT now()
);


--
-- Name: caja_ajustes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.caja_ajustes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: caja_ajustes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.caja_ajustes_id_seq OWNED BY public.caja_ajustes.id;


--
-- Name: caja_gastos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.caja_gastos (
    id integer NOT NULL,
    descripcion text NOT NULL,
    monto numeric(12,2) NOT NULL,
    autorizado_por character varying(150) NOT NULL,
    usuario_id integer,
    empresa_id integer NOT NULL,
    fecha timestamp without time zone DEFAULT now(),
    caja_turno_id integer
);


--
-- Name: caja_gastos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.caja_gastos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: caja_gastos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.caja_gastos_id_seq OWNED BY public.caja_gastos.id;


--
-- Name: cajas_turnos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas_turnos (
    id integer NOT NULL,
    usuario_id integer,
    empresa_id integer NOT NULL,
    estado character varying(20) DEFAULT 'abierta'::character varying,
    apertura_denominaciones jsonb DEFAULT '{}'::jsonb,
    cierre_denominaciones jsonb DEFAULT '{}'::jsonb,
    monto_apertura numeric(10,2) DEFAULT 0,
    monto_cierre numeric(10,2) DEFAULT 0,
    efectivo_esperado numeric(10,2) DEFAULT 0,
    ventas_efectivo numeric(10,2) DEFAULT 0,
    ventas_tarjeta numeric(10,2) DEFAULT 0,
    ventas_transferencia numeric(10,2) DEFAULT 0,
    ventas_credito numeric(10,2) DEFAULT 0,
    saldo_favor_usado numeric(10,2) DEFAULT 0,
    gastos numeric(10,2) DEFAULT 0,
    diferencia numeric(10,2) DEFAULT 0,
    observacion_apertura text,
    observacion_cierre text,
    fecha_apertura timestamp without time zone DEFAULT now(),
    fecha_cierre timestamp without time zone,
    reapertura_autorizada_por integer,
    reapertura_motivo text
);


--
-- Name: cajas_turnos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cajas_turnos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cajas_turnos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cajas_turnos_id_seq OWNED BY public.cajas_turnos.id;


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    empresa_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(150) NOT NULL,
    nit character varying(30),
    direccion text,
    telefono character varying(40),
    correo character varying(120),
    permite_credito boolean DEFAULT false,
    limite_credito numeric(12,2) DEFAULT 0,
    saldo_favor numeric(12,2) DEFAULT 0,
    saldo_pendiente numeric(12,2) DEFAULT 0,
    estado character varying(20) DEFAULT 'activo'::character varying,
    empresa_id integer NOT NULL,
    usuario_id integer,
    fecha_creacion timestamp without time zone DEFAULT now(),
    fecha_cumpleanos date
);


--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: clientes_movimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes_movimientos (
    id integer NOT NULL,
    cliente_id integer,
    tipo character varying(30) NOT NULL,
    monto numeric(12,2) NOT NULL,
    venta_id integer,
    motivo text,
    saldo_favor_anterior numeric(12,2) DEFAULT 0,
    saldo_favor_nuevo numeric(12,2) DEFAULT 0,
    saldo_pendiente_anterior numeric(12,2) DEFAULT 0,
    saldo_pendiente_nuevo numeric(12,2) DEFAULT 0,
    usuario_id integer,
    empresa_id integer NOT NULL,
    fecha timestamp without time zone DEFAULT now()
);


--
-- Name: clientes_movimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clientes_movimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clientes_movimientos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clientes_movimientos_id_seq OWNED BY public.clientes_movimientos.id;


--
-- Name: comanda_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comanda_detalle (
    id integer NOT NULL,
    comanda_id integer,
    producto_id integer,
    producto character varying(160) NOT NULL,
    cantidad numeric(10,2) NOT NULL,
    complementos jsonb DEFAULT '[]'::jsonb,
    observacion text
);


--
-- Name: comanda_detalle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comanda_detalle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comanda_detalle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comanda_detalle_id_seq OWNED BY public.comanda_detalle.id;


--
-- Name: comandas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comandas (
    id integer NOT NULL,
    venta_id integer,
    departamento character varying(120) NOT NULL,
    estado character varying(30) DEFAULT 'PENDIENTE'::character varying,
    usuario_id integer,
    empresa_id integer NOT NULL,
    fecha timestamp without time zone DEFAULT now(),
    nombre_cliente character varying(160),
    observacion text,
    fecha_preparacion timestamp without time zone,
    fecha_listo timestamp without time zone,
    fecha_entregado timestamp without time zone
);


--
-- Name: comandas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comandas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comandas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comandas_id_seq OWNED BY public.comandas.id;


--
-- Name: complemento_grupos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.complemento_grupos (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    empresa_id integer NOT NULL,
    nombre character varying(120) NOT NULL,
    obligatorio boolean DEFAULT true,
    seleccion_multiple boolean DEFAULT false,
    minimo integer DEFAULT 1,
    maximo integer DEFAULT 1,
    orden integer DEFAULT 0,
    activo boolean DEFAULT true,
    fecha timestamp without time zone DEFAULT now(),
    parent_opcion_id integer
);


--
-- Name: complemento_grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.complemento_grupos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: complemento_grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.complemento_grupos_id_seq OWNED BY public.complemento_grupos.id;


--
-- Name: complemento_opciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.complemento_opciones (
    id integer NOT NULL,
    grupo_id integer NOT NULL,
    nombre character varying(120) NOT NULL,
    precio_extra numeric(10,2) DEFAULT 0,
    activo boolean DEFAULT true,
    orden integer DEFAULT 0,
    fecha timestamp without time zone DEFAULT now()
);


--
-- Name: complemento_opciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.complemento_opciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: complemento_opciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.complemento_opciones_id_seq OWNED BY public.complemento_opciones.id;


--
-- Name: compra_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compra_detalle (
    id integer NOT NULL,
    compra_id integer,
    producto_id integer,
    cantidad integer NOT NULL,
    costo_unitario numeric(12,2) NOT NULL,
    subtotal numeric(12,2) NOT NULL
);


--
-- Name: compra_detalle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compra_detalle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compra_detalle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compra_detalle_id_seq OWNED BY public.compra_detalle.id;


--
-- Name: compras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compras (
    id integer NOT NULL,
    proveedor_id integer,
    documento character varying(100),
    total numeric(12,2) DEFAULT 0 NOT NULL,
    usuario_id integer,
    empresa_id integer NOT NULL,
    fecha timestamp without time zone DEFAULT now(),
    estado_pago character varying(20) DEFAULT 'pendiente'::character varying,
    fecha_vencimiento date,
    fecha_pago timestamp without time zone,
    metodo_pago character varying(30)
);


--
-- Name: compras_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compras_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compras_id_seq OWNED BY public.compras.id;


--
-- Name: contabilidad_cuentas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contabilidad_cuentas (
    id integer NOT NULL,
    codigo character varying(40) NOT NULL,
    nombre character varying(160) NOT NULL,
    tipo character varying(30) NOT NULL,
    naturaleza character varying(20) NOT NULL,
    cuenta_padre_id integer,
    permite_movimiento boolean DEFAULT true,
    estado character varying(20) DEFAULT 'activa'::character varying,
    empresa_id integer NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now()
);


--
-- Name: contabilidad_cuentas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contabilidad_cuentas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contabilidad_cuentas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contabilidad_cuentas_id_seq OWNED BY public.contabilidad_cuentas.id;


--
-- Name: contabilidad_partida_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contabilidad_partida_detalle (
    id integer NOT NULL,
    partida_id integer NOT NULL,
    cuenta_id integer NOT NULL,
    descripcion text,
    debe numeric(12,2) DEFAULT 0,
    haber numeric(12,2) DEFAULT 0
);


--
-- Name: contabilidad_partida_detalle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contabilidad_partida_detalle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contabilidad_partida_detalle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contabilidad_partida_detalle_id_seq OWNED BY public.contabilidad_partida_detalle.id;


--
-- Name: contabilidad_partidas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contabilidad_partidas (
    id integer NOT NULL,
    fecha timestamp without time zone DEFAULT now(),
    descripcion text NOT NULL,
    origen character varying(40) NOT NULL,
    referencia_id integer,
    referencia_codigo character varying(80),
    estado character varying(20) DEFAULT 'registrada'::character varying,
    usuario_id integer,
    empresa_id integer NOT NULL
);


--
-- Name: contabilidad_partidas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contabilidad_partidas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contabilidad_partidas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contabilidad_partidas_id_seq OWNED BY public.contabilidad_partidas.id;


--
-- Name: departamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departamentos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    empresa_id integer NOT NULL,
    fecha timestamp without time zone DEFAULT now()
);


--
-- Name: departamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departamentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departamentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departamentos_id_seq OWNED BY public.departamentos.id;


--
-- Name: detalle_ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_ventas (
    id integer NOT NULL,
    venta_id integer,
    producto_id integer,
    cantidad integer NOT NULL,
    precio numeric(10,2) NOT NULL,
    complementos jsonb DEFAULT '[]'::jsonb,
    descripcion text,
    observacion text
);


--
-- Name: detalle_ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_ventas_id_seq OWNED BY public.detalle_ventas.id;


--
-- Name: empresa_feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresa_feature_flags (
    empresa_id integer NOT NULL,
    feature_key character varying(120) NOT NULL,
    descripcion text,
    sandbox_activo boolean DEFAULT false,
    productivo_activo boolean DEFAULT false,
    estado character varying(40) DEFAULT 'pendiente'::character varying,
    actualizado_por integer,
    actualizado_en timestamp without time zone DEFAULT now()
);


--
-- Name: empresa_versiones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresa_versiones (
    empresa_id integer NOT NULL,
    version_productiva character varying(40) DEFAULT '1.0.0'::character varying,
    version_sandbox character varying(40) DEFAULT '1.0.0-beta'::character varying,
    estado character varying(40) DEFAULT 'pendiente'::character varying,
    notas text,
    aprobado_por integer,
    aprobado_en timestamp without time zone,
    publicado_por integer,
    publicado_en timestamp without time zone,
    actualizado_en timestamp without time zone DEFAULT now()
);


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresas (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    nit character varying(30),
    razon_social character varying(180),
    direccion text,
    codigo_establecimiento character varying(20),
    afiliacion_iva character varying(40),
    correo character varying(120),
    imprimir_factura_auto boolean DEFAULT false,
    imprimir_comanda_auto boolean DEFAULT false
);


--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;


--
-- Name: movimientos_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimientos_inventario (
    id integer NOT NULL,
    producto_id integer,
    tipo character varying(20) NOT NULL,
    cantidad integer NOT NULL,
    motivo text,
    usuario_id integer,
    empresa_id integer NOT NULL,
    fecha timestamp without time zone DEFAULT now()
);


--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.movimientos_inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.movimientos_inventario_id_seq OWNED BY public.movimientos_inventario.id;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    precio numeric(10,2) NOT NULL,
    categoria character varying(100),
    empresa_id integer,
    created_at timestamp without time zone DEFAULT now(),
    codigo character varying(50),
    precio_costo numeric(10,2),
    margen numeric(10,2),
    marca character varying(100),
    existencia integer DEFAULT 0,
    existencia_minima integer DEFAULT 0,
    habilitado_venta boolean DEFAULT true,
    upc character varying(50),
    controla_stock boolean DEFAULT true,
    tipo_producto character varying(40) DEFAULT 'producto'::character varying,
    se_fabrica boolean DEFAULT false,
    numero_serie character varying(120),
    medida_compra character varying(40),
    equivalente_inventario numeric(12,4) DEFAULT 1,
    medida_inventario character varying(40),
    departamento character varying(120),
    subcategoria character varying(120),
    familia character varying(120),
    cuenta_contable character varying(120),
    centro_costo character varying(120),
    imagen_url text
);


--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    telefono character varying(50),
    email character varying(150),
    direccion text,
    empresa_id integer NOT NULL,
    fecha timestamp without time zone DEFAULT now()
);


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: soporte_accesos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.soporte_accesos (
    id integer NOT NULL,
    superadmin_id integer,
    empresa_id integer,
    ambiente character varying(30) NOT NULL,
    accion character varying(80) NOT NULL,
    motivo text,
    fecha timestamp without time zone DEFAULT now()
);


--
-- Name: soporte_accesos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.soporte_accesos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: soporte_accesos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.soporte_accesos_id_seq OWNED BY public.soporte_accesos.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    password character varying(150) NOT NULL,
    rol character varying(50) NOT NULL,
    empresa_id integer,
    created_at timestamp without time zone DEFAULT now(),
    usuario_login character varying(80)
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ventas (
    id integer NOT NULL,
    total numeric(10,2) NOT NULL,
    metodo_pago character varying(50),
    empresa_id integer,
    fecha timestamp without time zone DEFAULT now(),
    subtotal numeric(12,2) DEFAULT 0,
    descuento_tipo character varying(20) DEFAULT 'monto'::character varying,
    descuento_valor numeric(12,2) DEFAULT 0,
    descuento_monto numeric(12,2) DEFAULT 0,
    efectivo_recibido numeric(12,2) DEFAULT 0,
    cambio numeric(12,2) DEFAULT 0,
    tarjeta_autorizacion character varying(120),
    cliente_nit character varying(50),
    cliente_nombre character varying(180),
    cliente_direccion text,
    usuario_id integer,
    tarjeta_monto numeric(12,2) DEFAULT 0,
    transferencia_monto numeric(12,2) DEFAULT 0,
    transferencia_codigo character varying(120),
    tipo_comprobante character varying(30) DEFAULT 'Factura'::character varying,
    recibo_codigo character varying(120),
    cliente_id integer,
    es_credito boolean DEFAULT false,
    estado_cuenta character varying(20) DEFAULT 'pagada'::character varying,
    saldo_favor_usado numeric(12,2) DEFAULT 0,
    fel_estado character varying(30) DEFAULT 'pendiente'::character varying,
    fel_numero_autorizacion character varying(80),
    fel_serie character varying(30),
    fel_numero character varying(40),
    fel_fecha_certificacion timestamp without time zone,
    fel_nit_certificador character varying(30),
    caja_turno_id integer
);


--
-- Name: ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ventas_id_seq OWNED BY public.ventas.id;


--
-- Name: caja_ajustes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_ajustes ALTER COLUMN id SET DEFAULT nextval('public.caja_ajustes_id_seq'::regclass);


--
-- Name: caja_gastos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos ALTER COLUMN id SET DEFAULT nextval('public.caja_gastos_id_seq'::regclass);


--
-- Name: cajas_turnos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos ALTER COLUMN id SET DEFAULT nextval('public.cajas_turnos_id_seq'::regclass);


--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: clientes_movimientos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes_movimientos ALTER COLUMN id SET DEFAULT nextval('public.clientes_movimientos_id_seq'::regclass);


--
-- Name: comanda_detalle id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comanda_detalle ALTER COLUMN id SET DEFAULT nextval('public.comanda_detalle_id_seq'::regclass);


--
-- Name: comandas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comandas ALTER COLUMN id SET DEFAULT nextval('public.comandas_id_seq'::regclass);


--
-- Name: complemento_grupos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos ALTER COLUMN id SET DEFAULT nextval('public.complemento_grupos_id_seq'::regclass);


--
-- Name: complemento_opciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_opciones ALTER COLUMN id SET DEFAULT nextval('public.complemento_opciones_id_seq'::regclass);


--
-- Name: compra_detalle id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compra_detalle ALTER COLUMN id SET DEFAULT nextval('public.compra_detalle_id_seq'::regclass);


--
-- Name: compras id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compras ALTER COLUMN id SET DEFAULT nextval('public.compras_id_seq'::regclass);


--
-- Name: contabilidad_cuentas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_cuentas ALTER COLUMN id SET DEFAULT nextval('public.contabilidad_cuentas_id_seq'::regclass);


--
-- Name: contabilidad_partida_detalle id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_partida_detalle ALTER COLUMN id SET DEFAULT nextval('public.contabilidad_partida_detalle_id_seq'::regclass);


--
-- Name: contabilidad_partidas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_partidas ALTER COLUMN id SET DEFAULT nextval('public.contabilidad_partidas_id_seq'::regclass);


--
-- Name: departamentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos ALTER COLUMN id SET DEFAULT nextval('public.departamentos_id_seq'::regclass);


--
-- Name: detalle_ventas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_ventas ALTER COLUMN id SET DEFAULT nextval('public.detalle_ventas_id_seq'::regclass);


--
-- Name: empresas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- Name: movimientos_inventario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario ALTER COLUMN id SET DEFAULT nextval('public.movimientos_inventario_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: soporte_accesos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.soporte_accesos ALTER COLUMN id SET DEFAULT nextval('public.soporte_accesos_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: ventas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id SET DEFAULT nextval('public.ventas_id_seq'::regclass);


--
-- Name: caja_ajustes caja_ajustes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_ajustes
    ADD CONSTRAINT caja_ajustes_pkey PRIMARY KEY (id);


--
-- Name: caja_gastos caja_gastos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_pkey PRIMARY KEY (id);


--
-- Name: cajas_turnos cajas_turnos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_pkey PRIMARY KEY (id);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_empresa_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_empresa_id_codigo_key UNIQUE (empresa_id, codigo);


--
-- Name: clientes_movimientos clientes_movimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes_movimientos
    ADD CONSTRAINT clientes_movimientos_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: comanda_detalle comanda_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comanda_detalle
    ADD CONSTRAINT comanda_detalle_pkey PRIMARY KEY (id);


--
-- Name: comandas comandas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comandas
    ADD CONSTRAINT comandas_pkey PRIMARY KEY (id);


--
-- Name: complemento_grupos complemento_grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_pkey PRIMARY KEY (id);


--
-- Name: complemento_opciones complemento_opciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_opciones
    ADD CONSTRAINT complemento_opciones_pkey PRIMARY KEY (id);


--
-- Name: compra_detalle compra_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compra_detalle
    ADD CONSTRAINT compra_detalle_pkey PRIMARY KEY (id);


--
-- Name: compras compras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT compras_pkey PRIMARY KEY (id);


--
-- Name: contabilidad_cuentas contabilidad_cuentas_empresa_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_cuentas
    ADD CONSTRAINT contabilidad_cuentas_empresa_id_codigo_key UNIQUE (empresa_id, codigo);


--
-- Name: contabilidad_cuentas contabilidad_cuentas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_cuentas
    ADD CONSTRAINT contabilidad_cuentas_pkey PRIMARY KEY (id);


--
-- Name: contabilidad_partida_detalle contabilidad_partida_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_partida_detalle
    ADD CONSTRAINT contabilidad_partida_detalle_pkey PRIMARY KEY (id);


--
-- Name: contabilidad_partidas contabilidad_partidas_empresa_id_origen_referencia_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_partidas
    ADD CONSTRAINT contabilidad_partidas_empresa_id_origen_referencia_id_key UNIQUE (empresa_id, origen, referencia_id);


--
-- Name: contabilidad_partidas contabilidad_partidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_partidas
    ADD CONSTRAINT contabilidad_partidas_pkey PRIMARY KEY (id);


--
-- Name: departamentos departamentos_nombre_empresa_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_nombre_empresa_id_key UNIQUE (nombre, empresa_id);


--
-- Name: departamentos departamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_pkey PRIMARY KEY (id);


--
-- Name: detalle_ventas detalle_ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT detalle_ventas_pkey PRIMARY KEY (id);


--
-- Name: empresa_feature_flags empresa_feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_feature_flags
    ADD CONSTRAINT empresa_feature_flags_pkey PRIMARY KEY (empresa_id, feature_key);


--
-- Name: empresa_versiones empresa_versiones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_versiones
    ADD CONSTRAINT empresa_versiones_pkey PRIMARY KEY (empresa_id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: movimientos_inventario movimientos_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: soporte_accesos soporte_accesos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.soporte_accesos
    ADD CONSTRAINT soporte_accesos_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);


--
-- Name: usuarios_empresa_login_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usuarios_empresa_login_unique ON public.usuarios USING btree (empresa_id, lower((usuario_login)::text)) WHERE ((usuario_login IS NOT NULL) AND ((usuario_login)::text <> ''::text));


--
-- Name: caja_ajustes caja_ajustes_autorizador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_ajustes
    ADD CONSTRAINT caja_ajustes_autorizador_id_fkey FOREIGN KEY (autorizador_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: caja_ajustes caja_ajustes_caja_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_ajustes
    ADD CONSTRAINT caja_ajustes_caja_turno_id_fkey FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE CASCADE;


--
-- Name: caja_ajustes caja_ajustes_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_ajustes
    ADD CONSTRAINT caja_ajustes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: caja_ajustes caja_ajustes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_ajustes
    ADD CONSTRAINT caja_ajustes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey1 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey10; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey10 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey11; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey11 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey12; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey12 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey13; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey13 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey14; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey14 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey15; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey15 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey16; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey16 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey17; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey17 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey18; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey18 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey19; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey19 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey2 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey20; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey20 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey21; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey21 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey22; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey22 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey23; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey23 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey24; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey24 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey25; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey25 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey26; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey26 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey27; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey27 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey28; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey28 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey29; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey29 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey3 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey30; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey30 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey31; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey31 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey32; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey32 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey33; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey33 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey34; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey34 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey35; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey35 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey36; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey36 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey37; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey37 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey38; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey38 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey39; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey39 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey4 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey40; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey40 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey5 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey6 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey7 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey8 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: caja_gastos caja_gastos_caja_turno_id_fkey9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja_gastos
    ADD CONSTRAINT caja_gastos_caja_turno_id_fkey9 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey1 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey10; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey10 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey11; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey11 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey12; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey12 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey13; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey13 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey14; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey14 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey15; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey15 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey16; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey16 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey17; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey17 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey18; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey18 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey19; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey19 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey2 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey20; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey20 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey21; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey21 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey22; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey22 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey23; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey23 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey24; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey24 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey25; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey25 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey26; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey26 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey27; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey27 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey28; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey28 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey29; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey29 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey3 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey4 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey5 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey6 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey7 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey8 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_reapertura_autorizada_por_fkey9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_reapertura_autorizada_por_fkey9 FOREIGN KEY (reapertura_autorizada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: cajas_turnos cajas_turnos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas_turnos
    ADD CONSTRAINT cajas_turnos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: categorias categorias_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);


--
-- Name: clientes_movimientos clientes_movimientos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes_movimientos
    ADD CONSTRAINT clientes_movimientos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: clientes_movimientos clientes_movimientos_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes_movimientos
    ADD CONSTRAINT clientes_movimientos_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE SET NULL;


--
-- Name: comanda_detalle comanda_detalle_comanda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comanda_detalle
    ADD CONSTRAINT comanda_detalle_comanda_id_fkey FOREIGN KEY (comanda_id) REFERENCES public.comandas(id) ON DELETE CASCADE;


--
-- Name: comanda_detalle comanda_detalle_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comanda_detalle
    ADD CONSTRAINT comanda_detalle_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE SET NULL;


--
-- Name: comandas comandas_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comandas
    ADD CONSTRAINT comandas_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey1 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey10; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey10 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey11; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey11 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey12; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey12 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey13; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey13 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey14; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey14 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey15; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey15 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey16; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey16 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey17; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey17 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey18; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey18 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey19; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey19 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey2 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey20; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey20 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey21; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey21 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey22; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey22 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey23; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey23 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey24; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey24 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey25; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey25 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey26; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey26 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey27; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey27 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey28; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey28 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey29; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey29 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey3 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey30; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey30 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey31; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey31 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey32; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey32 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey33; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey33 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey34; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey34 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey35; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey35 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey36; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey36 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey37; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey37 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey38; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey38 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey39; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey39 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey4 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey40; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey40 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey41; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey41 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey42; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey42 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey43; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey43 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey44; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey44 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey45; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey45 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey46; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey46 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey47; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey47 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey48; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey48 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey49; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey49 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey5 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey50; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey50 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey51; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey51 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey52; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey52 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey53; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey53 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey54; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey54 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey55; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey55 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey56; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey56 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey57; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey57 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey58; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey58 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey59; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey59 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey6 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey60; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey60 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey61; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey61 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey62; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey62 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey63; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey63 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey64; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey64 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey65; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey65 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey66; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey66 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey67; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey67 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey7 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey8 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_parent_opcion_id_fkey9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_parent_opcion_id_fkey9 FOREIGN KEY (parent_opcion_id) REFERENCES public.complemento_opciones(id) ON DELETE CASCADE;


--
-- Name: complemento_grupos complemento_grupos_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_grupos
    ADD CONSTRAINT complemento_grupos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: complemento_opciones complemento_opciones_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complemento_opciones
    ADD CONSTRAINT complemento_opciones_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.complemento_grupos(id) ON DELETE CASCADE;


--
-- Name: compra_detalle compra_detalle_compra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compra_detalle
    ADD CONSTRAINT compra_detalle_compra_id_fkey FOREIGN KEY (compra_id) REFERENCES public.compras(id) ON DELETE CASCADE;


--
-- Name: compra_detalle compra_detalle_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compra_detalle
    ADD CONSTRAINT compra_detalle_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE SET NULL;


--
-- Name: compras compras_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compras
    ADD CONSTRAINT compras_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id) ON DELETE SET NULL;


--
-- Name: contabilidad_cuentas contabilidad_cuentas_cuenta_padre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_cuentas
    ADD CONSTRAINT contabilidad_cuentas_cuenta_padre_id_fkey FOREIGN KEY (cuenta_padre_id) REFERENCES public.contabilidad_cuentas(id) ON DELETE SET NULL;


--
-- Name: contabilidad_cuentas contabilidad_cuentas_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_cuentas
    ADD CONSTRAINT contabilidad_cuentas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: contabilidad_partida_detalle contabilidad_partida_detalle_cuenta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_partida_detalle
    ADD CONSTRAINT contabilidad_partida_detalle_cuenta_id_fkey FOREIGN KEY (cuenta_id) REFERENCES public.contabilidad_cuentas(id) ON DELETE RESTRICT;


--
-- Name: contabilidad_partida_detalle contabilidad_partida_detalle_partida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_partida_detalle
    ADD CONSTRAINT contabilidad_partida_detalle_partida_id_fkey FOREIGN KEY (partida_id) REFERENCES public.contabilidad_partidas(id) ON DELETE CASCADE;


--
-- Name: contabilidad_partidas contabilidad_partidas_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_partidas
    ADD CONSTRAINT contabilidad_partidas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: contabilidad_partidas contabilidad_partidas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contabilidad_partidas
    ADD CONSTRAINT contabilidad_partidas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: departamentos departamentos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: detalle_ventas detalle_ventas_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT detalle_ventas_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: detalle_ventas detalle_ventas_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT detalle_ventas_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);


--
-- Name: empresa_feature_flags empresa_feature_flags_actualizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_feature_flags
    ADD CONSTRAINT empresa_feature_flags_actualizado_por_fkey FOREIGN KEY (actualizado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: empresa_feature_flags empresa_feature_flags_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_feature_flags
    ADD CONSTRAINT empresa_feature_flags_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: empresa_versiones empresa_versiones_aprobado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_versiones
    ADD CONSTRAINT empresa_versiones_aprobado_por_fkey FOREIGN KEY (aprobado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: empresa_versiones empresa_versiones_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_versiones
    ADD CONSTRAINT empresa_versiones_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: empresa_versiones empresa_versiones_publicado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_versiones
    ADD CONSTRAINT empresa_versiones_publicado_por_fkey FOREIGN KEY (publicado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: movimientos_inventario movimientos_inventario_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: productos productos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);


--
-- Name: soporte_accesos soporte_accesos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.soporte_accesos
    ADD CONSTRAINT soporte_accesos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: soporte_accesos soporte_accesos_superadmin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.soporte_accesos
    ADD CONSTRAINT soporte_accesos_superadmin_id_fkey FOREIGN KEY (superadmin_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: usuarios usuarios_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);


--
-- Name: ventas ventas_caja_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey1 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey10; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey10 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey11; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey11 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey12; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey12 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey13; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey13 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey14; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey14 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey15; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey15 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey16; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey16 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey17; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey17 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey18; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey18 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey19; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey19 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey2 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey20; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey20 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey21; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey21 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey22; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey22 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey23; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey23 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey24; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey24 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey25; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey25 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey26; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey26 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey27; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey27 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey28; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey28 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey29; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey29 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey3 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey30; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey30 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey31; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey31 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey32; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey32 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey33; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey33 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey34; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey34 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey35; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey35 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey36; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey36 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey37; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey37 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey38; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey38 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey39; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey39 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey4 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey40; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey40 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey5 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey6 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey7 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey8 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_caja_turno_id_fkey9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_caja_turno_id_fkey9 FOREIGN KEY (caja_turno_id) REFERENCES public.cajas_turnos(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;


--
-- Name: ventas ventas_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);


--
-- PostgreSQL database dump complete
--

