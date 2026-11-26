# Mi Actividad

App para registrar cada día flexiones, abdominales, sentadillas, km corriendo y km andando, con un calendario de actividad.

Los datos se guardan **solo en el teléfono**. No se envían a ningún servidor.

## Probar en el PC

Haz doble clic en `index.html`. Se abre en el navegador y puedes usarla. Los datos que registres en el PC no pasan al móvil.

## Instalar en Android (GitHub Pages, gratis)

Chrome solo permite instalar la app si se abre una vez desde una dirección `https://`. Esa página solo aloja el código; tus registros siguen guardándose en el teléfono.

1. Crea una cuenta en https://github.com si no tienes.
2. Pulsa **New repository**, ponle un nombre (por ejemplo `mi-actividad`), marca **Public** y créalo.
3. En el repositorio, pulsa **Add file → Upload files** y arrastra **todo el contenido** de esta carpeta, incluida la carpeta `icons`. Pulsa **Commit changes**.
4. Ve a **Settings → Pages**. En *Branch* elige `main` y la carpeta `/ (root)`, y pulsa **Save**.
5. Espera 1 o 2 minutos. La dirección será `https://TU-USUARIO.github.io/mi-actividad/`.
6. Abre esa dirección en **Chrome** en el móvil. En el menú ⋮, pulsa **Instalar aplicación** o **Añadir a pantalla de inicio**.

Desde ese momento se abre como una app normal y **funciona sin internet**.

## Copias de seguridad

En **Ajustes**:

- **Exportar copia de seguridad** descarga un archivo `.json` con todos tus registros.
- **Importar copia de seguridad** recupera ese archivo, por ejemplo en un móvil nuevo. No duplica registros que ya existan.
- **Exportar a Excel (CSV)** descarga una tabla para abrirla en Excel.

⚠️ Si desinstalas la app o borras los datos de Chrome, se pierden los registros. Exporta una copia de vez en cuando.

## Actualizar la app

Sube los archivos modificados al mismo repositorio. El móvil carga la versión nueva la segunda vez que abres la app.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura de las pantallas |
| `styles.css` | Diseño (modo claro y oscuro automático) |
| `app.js` | Lógica: registros, calendario, copias |
| `manifest.webmanifest` | Nombre e icono de la app instalada |
| `sw.js` | Permite usarla sin conexión |
| `icons/` | Iconos de la app |
