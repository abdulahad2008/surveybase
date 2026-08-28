# vendor/

## xlsx-0.20.3.tgz — SheetJS Community Edition

SheetJS stopped publishing to the npm registry after 0.18.5 and now ships from
its own CDN. `package.json` used to point straight at that URL, which made
every install — including every Vercel build — depend on `cdn.sheetjs.com`
being reachable, and put the parser outside anything `npm audit` can see.

Downgrading to the last registry version was not an option: 0.18.5 carries
CVE-2023-30533 (prototype pollution, fixed in 0.19.3) and CVE-2024-22363
(ReDoS, fixed in 0.20.2), and both are reached by parsing a crafted workbook —
which is exactly what this archive does with every deposited file.

So the published tarball is committed here instead and installed with
`"xlsx": "file:vendor/xlsx-0.20.3.tgz"`. Installs no longer touch the network
for it, and the version stays the patched one.

Provenance — this file is byte-identical to what the CDN served, and to what
the previous lockfile recorded:

    curl -sSL -O https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
    shasum -a 512 xlsx-0.20.3.tgz | cut -d' ' -f1 | xxd -r -p | base64
    # sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==

To update: download the new tarball from https://cdn.sheetjs.com/, verify the
hash against the one SheetJS publishes, drop it in here, delete the old one,
and point `package.json` at the new filename.
