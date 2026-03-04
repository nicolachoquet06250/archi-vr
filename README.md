# Archi VR

Création d'une application d'architecture complète avec la spécificité qu'elle intègre une vue 3D ET une vue VR destiné aux client pour la visite immersive du batiment

![GitHub Actions Alwaysdata Workflow Status](https://img.shields.io/github/actions/workflow/status/nicolachoquet06250/archi-vr/deploy-alwaysdata.yml?label=Application%20d%C3%A9ploy%C3%A9e)
![Website Status](https://img.shields.io/website?url=https%3A%2F%2Farchi-vr.nicovers06.fr&label=Application)
![GitHub Actions Docker Workflow Status](https://img.shields.io/github/actions/workflow/status/nicolachoquet06250/archi-vr/docker-publish.yml?label=Image%20docker%20d%C3%A9ploy%C3%A9e)

## Run in local

### Via docker compose

```shell
docker compose up
```

### Via nodejs

```shell
npm run dev
```

## Run in production

```shell
docker compose -f docker-compose.prod.yml up
```



## For new design

- Go to http://localhost:3000/v2

**Actual available version**
![Actual available version](./public/screenshot-actual-version.png)

**Actual available version with opened menu**
![Actual available version](./public/screenshot-actual-version-with-opened-menu.png)

## Mock-ups

**2D PLAN View**
![Mock-up for 2D PLAN View](./public/mock-up-2d-plan.jpg)

**3D View**
![Mock-up for 3D View](./public/mock-up-3d-plan.jpg)