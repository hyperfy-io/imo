# 🦁 IMO Pet

Interoperable metaverse pets built on the [IMO Standard](../../README.md).

## Model Guidelines

While technically any GLB model will work as a pet, there are a few guidelines that creators should follow:

1. Use real-world scale in meters.
1. Treat origin as the ground reference point.
1. Treat negative z-axis as the forward direction (blender coordinate system)

In addition to this, each GLB should include:

1. An `idle` animation that will be used when the pet is idle, eg standing and looking around
1. A `move` animation that will be used when the pet is moving, eg walking, running or flying
1. A `stay` animation that will be used when the pet has no objectives or has been ordered to stay, eg sitting or lying down
1. A mesh that includes `_hitbox` in its name, used to approximate the shape of the pet for interaction and determine its size (use a fully transparent material for proper interoperability)

## Model Restrictions

The ability to define custom UGC assets such as 3D models for a pet introduces a universal issue of performance.

It is fair to say that no platform (or engine) is able to support an infinite amount of compute, so it seems like it is in our best interest to introduce object restrictions.

Some platforms may choose to ignore some or all of these but creators should strive to meet the specs outlined here in order for their pets to be compatible across a larger number of platforms.

| Name       | Limit               |
| ---------- | ------------------- |
| File Size  | 3 MB                |
| Bounds     | 3m x 3m x 3m        |
| Triangles  | 16,000              |
| Textures   | 2048 x 2048 (Total) |
| Draw Calls | 1                   |

## Schema

Each pet must include metadata that provides additional information for platforms to use:

```json
{
  "type": "pet",
  "version": "1.0.0",
  "name": "Wolf",
  "description": "A little blue wolf",
  "speed": 3,
  "emotes": [
    {
      "name": "Bark",
      "animation": "bark",
      "audio": "bark.mp3"
    },
    {
      "name": "Flip",
      "animation": "flip",
      "audio": "flip.mp3"
    }
  ]
}
```

### `type`

The IMO type. In this case it is a `pet`

### `version`

A semver version of the IMO pet standard being used.

### `name`

A short name for the pet, eg `Wolf`.

Each platform may use this in different ways. For example, in UI or as nametags above the pet, etc.

### `description`

A description of the pet.

Each platform may use this differently. For example, when inspecting a pet.

### `speed`

The speed of the `move` animation in meters per second. The actual movement speed of the pet is determined by the platform.

### `emotes`

Emotes are optional but provide extra personality for a pet.

Each platform may execute emotes however they like, eg on a timer or when interacting with the pet.

Each emote includes:

1. (required) The `name` of the emote for use in UI
1. (required) The `animation` to play. The animation is played just once.
1. (optional) The `audio` clip to play. Must be `.mp3`.

## Platform Implementation

Each platform has the freedom to choose how pets will work in their engine. Some platforms may choose to have roaming pets with pathfinding, be powered by AI or use much simpler mechanics.

Here is a simple idea of how the attributes can work together to form a pet behavior:

1. The pet spawns in front of its owner looking at them, using the `idle` animation
1. The hitbox bounds of the pet is used to ensure it stands next to the player and not on top of the player
1. If the owner moves away from the pet, the pet will follow at the same speed, using the `move` animation and `speed` value to modulate the timescale of the animation
1. When the owner or someone else interacts with the pet, a random `emote` is chosen and executed
1. When the owner commands the pet to `stay`, the pet no longer follows its owner

## IMO Pet Editor

We created an open source tool for creating and editing IMO Pet GLBs:

https://imo-pet.hyperfy.io

The source code can be found here in this repo.
