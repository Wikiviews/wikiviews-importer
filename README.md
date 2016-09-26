# Wikiviews Importer
A tool for importing excerpts from the [Wikipedia Pageviews dataset](https://dumps.wikimedia.org/other/pageviews/) into [Elasticsearch](https://github.com/Wikiviews/wikiviews-elasticsearch) for the use as data-backend for the Wikiviews application.

It automates the process of selecting, downloading and parsing the data and inserting them into Elasticsearch.

## Installation
### via NPM
The project provides an NPM package, which can be installed via
```shell
npm install -g @wikiviews/wikiviews-importer
```
This package is automatically generated for each repository tag via [Travis-CI](https://travis-ci.org/Wikiviews/wikiviews-importer)([![Build Status](https://travis-ci.org/Wikiviews/wikiviews-importer.svg?branch=master)](https://travis-ci.org/Wikiviews/wikiviews-importer)).

### Manually
After cloning the repository, you can install the package manually via
```shell
npm install && npm run build && npm install -g
```

## Usage
The tool provides the commandline utility
```shell
wv-import
```
to perform the import.

It optionally accepts a path to a configuration file as first parameter and optional configuration via commandline parameters.

### Configuration
The importer can be configured via a configuration file in JSON format and via commandline parameters (in the format `--{PARAMETERNAME}={VALUE}`).

The following configuration options are available:

 Option | Corresponding CLI parameter | Description | Default
 -------|-----------------------------|-------------|--------
 `tasks.download` | `download` | If set to `true`, the selected data dumps are downloaded.<br> If set to `false`, the selection is applied to all already existing elements in the destination directory, which are then used as source. | `true`
 `tasks.elasticsearch` | `elasticsearch` | If set to `true`, the selected data dumps are inserted into Elasticsearch, otherwise not. | `true`
 `download.source` | `source` | The source pattern.<br> It needs to be a URL pointing to the data dumps containing variables (consecutive appearances of variables, which are longer than the value are padded with preceding zeros), which are then substituted by the selected date ranges. Keep in mind, that *ALL* occurrences of the variables are substituted and the variables are the same, which are used in the `download.output` pattern. so choose your variables wisely (or stick to the default). | `'https://dumps.wikimedia.org/other/pageviews/bbbb/bbbb-ff/pageviews-bbbbffjj-ll0000.gz'`
 `download.output` | `output` | The output filename pattern.<br> It needs to contain the same variables like the `download.source` pattern, which are then substituted by the selected date ranges. | `'bbbb-ff-jj-ll.csv'`
 `download.destination` | `destination` | The destination directory, where the output files are written to. | `./data`
 `download.years` | `years` | The selected range of downloaded years.<br> The variable you have chosen for years (by default `b`) is substituted by the values in this range. It needs to be specified in the format `'{VARIABLE}:{BEGINNING}-{END}'`. | `'b:2016-2016'`
 `download.months` | `months` | The selected range of downloaded months in each year.<br> The variable you have chosen for months (by default `f`) is substituted by the values in this range. It needs to be specified in the format `'{VARIABLE}:{BEGINNING}-{END}'`. | `'f:1-1'`
`download.days` | `days` | The selected range of downloaded days in each month.<br> The variable you have chosen for days (by default `j`) is substituted by the values in this range. It needs to be specified in the format `'{VARIABLE}:{BEGINNING}-{END}'`. | `'j:1-31'`
`download.hours` | `hours` | The selected range of downloaded hours in each day.<br> The variable you have chosen for hours (by default `j`) is substituted by the values in this range. It needs to be specified in the format `'{VARIABLE}:{BEGINNING}-{END}'`. | `'l:0-23'`
`download.concurrent` | `concurrentDownloads` | The number of concurrently downloaded dump files.<br> The Wikipedia Dump server allows only 3 concurrent downloads per source. | `3`
`download.compression` | `sourceCompression` | The compression algorithm used to decompress the source files.<br> The values `'gz'` (for gzip) and `'zip'` (for zip) are supported. All other values will deactivate decompression.<br> The Wikipedia dumps are compressed via gzip. | `'gz'`
`elasticsearch.port` | `esPort` | The port on which the target Elasticsearch instance is listening. | `9200`
`elasticsearch.address` | `esAddress` | The address / domain on which the target Elasticsearch instance is listening. | `'localhost'`
`elasticsearch.index` | `esIndex` | The target index in the Elasticsearch cluster.<br> The default matches if the Cluster is set up via `wikiviews-elasticsearch`. | `'wikiviews'`
`elasticsearch.type` | `esType` | The target type in the Elasticsearch cluster.<br> The default matches if the Cluster is set up via `wikiviews-elasticsearch`. | `'article'`
`elasticsearch.concurrent` | `concurrentInsertions` | The number of files, which get inserted concurrently into elasticsearch. Either `'all'` or the number of files. | `'all'` 
`elasticsearch.batch` | `batchInsert` | The number of batch-inserted dataset rows.<br> Adapt the value to optimize your memory consumption. | `10000`

For example the configuration file, which would set the default values would look like this:
```json
{
  "tasks": {
    "download": true,
    "elasticsearch": true
  },
  "download": {
    "source": "https://dumps.wikimedia.org/other/pageviews/bbbb/bbbb-ff/pageviews-bbbbffjj-ll0000.gz",
    "output": "bbbb-ff-jj-ll.csv",
    "destination": "./data",
    "years": "b:2016-2016",
    "months": "f:1-1",
    "days": "j:1-31",
    "hours": "l:0-23",
    "concurrent": 3,
    "compression": "gz"
  },
  "elasticsearch": {
    "port": 9200,
    "address": "localhost",
    "index": "wikiviews",
    "type": "article",
    "concurrent": "all",
    "batch": 10000
  }
}
```
### Running
The tool is ran via the `wv-import` command.<br>
Running the command with the configuration file `config.json` and without downloading the source data, would look like this:
```shell
wv-import config.json --download=false
```
