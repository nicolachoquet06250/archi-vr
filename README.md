# Archi VR

ArchiVR est **un logiciel d'architecture complet** avec la **spécificité** qu'il intègre une **visualisation 3D du bâtiment**, mais également une **visualisation en réalité virtuelle**, ce qui pourrait vous permettre de faire une **visite guidée immersive du bâtiment à vos clients**.

C'est le **premier logiciel d'architecture entièrement responsive** donc **accessible et utilisable sur mobiles et tablettes**.

[![GitHub Actions Alwaysdata Workflow Status](https://img.shields.io/github/actions/workflow/status/nicolachoquet06250/archi-vr/deploy-alwaysdata.yml?label=Application%20d%C3%A9ploy%C3%A9e)](https://archi-vr.nicovers06.fr)
[![Website Status](https://img.shields.io/website?url=https%3A%2F%2Farchi-vr.nicovers06.fr&label=Application)](https://archi-vr.nicovers06.fr)
[![Website Status](https://img.shields.io/website?url=https%3A%2F%2Farchi-vr.nicovers06.fr%2Fv2&label=Application%20V2)](https://archi-vr.nicovers06.fr/v2)
[![GitHub Actions Docker Workflow Status](https://img.shields.io/github/actions/workflow/status/nicolachoquet06250/archi-vr/docker-publish.yml?label=Image%20docker%20d%C3%A9ploy%C3%A9e)](https://github.com/nicolachoquet06250/archi-vr/pkgs/container/archi-vr)

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

## New design

> https://archi-vr.nicovers06.fr/v2

**Actual available version**
![Actual available version](./public/screenshot-actual-version.png)

**Actual available version with opened menu**
![Actual available version](./public/screenshot-actual-version-with-opened-menu.png)

## Mock-ups

**2D PLAN View**
![Mock-up for 2D PLAN View](./public/mock-up-2d-plan.jpg)

**3D View**
![Mock-up for 3D View](./public/mock-up-3d-plan.jpg)