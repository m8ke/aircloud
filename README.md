<a name="top"></a>

<h1 style="margin: 0;" align="center">AirCloud</h1>

<p align="center">
AirCloud is a decentralized web-based application for end-to-end encrypted file sharing built on top of WebRTC. Secure
way to transfer files across devices. We never upload, store, or track files.
</p>

![desktop-mobile.png](docs/cover.png)

## Features

<small><a href="#top">back to top</a></small>

| Feature                   | Description                                                                                                    |
|---------------------------|----------------------------------------------------------------------------------------------------------------|
| **Cross-device**          | Use any device with a [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) supported browser  |
| **Peer-to-peer**          | Direct connection and file transfer between peers without a central server or third-party storage              |
| **Auto-discover peers**   | Detect other peers in the same network (including VPN, LAN, public Wi-Fi)                                      |
| **Manual connection**     | Connect using a 6-digit code or QR code for peers outside the same network                                     |
| **No limitations**        | Send as many or large files as you want, everything depends on WebRTC capabilities, and network speed of peers |
| **No sign-up or ads**     | You don't see annoying ads, or need to sign-up after few transfer                                              |
| **End-to-end encryption** | File transfers are always encrypted                                                                            |
| **Anonymity**             | Never upload, store, or track files, IPs etc                                                                   |
| **Open source**           | Review the source code, contribute, or share ideas to improve the project                                      |

## Roadmap

<small><a href="#top">back to top</a></small>

| Feature                  | Description                                                                      |
|--------------------------|----------------------------------------------------------------------------------|
| **Metadata removal**     | Read and/or remove metadata from images, videos, etc., to ensure maximum privacy |
| **Localization**         | Translate into multiple languages (community contributions welcome)              |
| **Self-hostable**        | Docker image to provide easy self-hosting                                        |
| **Dark and light theme** | Toggle between dark and light modes                                              |
| **Desktop app**          | Desktop application for MacOS, Windows, and Linux                                |
| **Mobile app**           | Mobile application for iOS and Android                                           |
| **TV app**               | TV application for tvOS and Android TV                                           |

## Platforms

<small><a href="#top">back to top</a></small>

|            | **Browser** | **Desktop app** | **Mobile app** | **TV app** |
|------------|-------------|-----------------|----------------|------------|
| **Status** | Beta        | Planned         | Planned        | Planned    |

## Technology stack

<small><a href="#top">back to top</a></small>

| Technology     | Scope          | Description                                             |
|----------------|----------------|---------------------------------------------------------|
| Docker         | Core           | Containerization                                        |
| GitHub Actions | Core           | CI/CD pipelines                                         |
| Spring Boot    | Server         | Server-side application built in Java                   |
| Angular        | Client         | Client-side application built in TypeScript             |
| WebRTC         | Client         | Establish P2P connection between clients                |
| Zip.js         | Client         | Zip files on client-side to send as a bundle            |
| WebSocket      | Client, Server | Signaling service for data exchange between two clients |

## Recommendations

<small><a href="#top">back to top</a></small>

Although AirCloud prioritizes privacy when sharing files between peers, for additional security you should consider
using a (self-hosted) VPN and user-agent spoofing at the operating system level.

## Support

<small><a href="#top">back to top</a></small>

Feel free to open an issue, submit a pull request, or simply give the project a star to show your support.

___

<p align="center">Thank you!</p>
