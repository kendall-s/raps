# Run Analysis & Processing Sheet (RAPS)

An Electron based application for the recording of key information pertaining to an AA3 analysis. Highly specific to the Hydrochemistry teams requirements aboard RV Investigator.

#### Big TODOs:
- Add tests (form filling, saving, reading tests highly required)
- ~~Refactor so that Javascript is split up in a logical sense~~ (30/11/2020)
- ~~Implement final version collation functionality~~ (1/12/2020)
- ~~Implement open explorer to appdata backup folder~~ (18/09/2020)
- Implement search functionality within page
- Clean up bookmark functionality bug where document shrinks
- Refactor inline styles to classes when happy 

<br>

## The RAPS application is used for recording important information relating to a nutrient analysis

### Features Include:
- 📑 Customised form specific to AA3 analysis
- ⚡ Lightweight (ignoring RAM plzqrjjjm) and fast loading 
- 💾💾 Double redundancy file saving - ensuring any data saved is never overwritten and always recoverable
- 📅 Data saved in simple .csv format, allowing for straightforward data accessibility
- 📂 Collates a folder worth of files into one spreadsheet for data driven overview
- 📊 Highly extensible, future version can include functionality for inline interactive charting using existing Javascript libraries

<br>

---

<br>

## To Run

1. Install Nodejs version >10.1

2. Navigate to folder and run npm install 

3. To open the RAPS run npm start

Alternatively navigate to releases and download the latest built executable for use on Windows

## To Package
Automated Github actions have been setup to facilitate cloud packaging of the RAPS application. The build workflow is triggered whenever a new "release" tag is push to the repo. A release tag is denoted as beginning with a v, e.g. v0.0.10

```
git tag "v1.1.1"
git push -u origin "v1.1.1"
```

---


 
