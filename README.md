## Run Analysis & Processing Sheet (RAPS)

## Big TODOs:
- Add tests 
- Implement final version collation functionality
- ~~Implement open explorer to appdata backup folder~~ (18/09/2020)
- Implement search functionality within page
- Clean up bookmark functionality bug where document shrinks
- Refactor inline styles to classes when happy 

#### The RAPS application is used for recording important information relating to a nutrient analysis.

### Features Include:
- Customised form specific to AA3 analysis
- Lightweight and fast loading (less than a couple seconds to open)
- Double redundancy file saving - ensuring any data saved is never overwritten and always recoverable
- Data saved in simple .csv format, allowing for straightforward data accessibility
- Highly extensible, future version can include functionality for inline interactive charting using existing Javascript libraries

---

## To Run

1. Install Nodejs version >10.1

2. Navigate to folder and run npm install 

3. To open the RAPS run npm start

Alternatively navigate to releases and download the latest built executable for use on Windows
