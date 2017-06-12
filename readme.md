# skypdump

![dump truck](/dump-truck-2.jpg)

## Requires
* nodejs
* npm

## How to use
First, COPY your skype main.db file into this directory

```
Mac:     ~/Library/Application Support/Skype/<your skype name>/main.db
Windows: C:\\Users\\<you>\\AppData\\Local\\Packages\\Microsoft.SkypeApp_<some number>\\LocalState\\<your skype name>\\main.db
```

Then:

```
npm install
```

Then:

```
nodejs ./skypedump.js --rooms          ## Show all rooms you are in
nodejs ./skypedump.js --dump <number>  ## Dump a particular room (you choose it by its id)
```