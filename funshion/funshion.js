
var monkey = {
  title: '',
  mediaid: '',       // 专辑ID;
  number: '',        // 第几集, 从1计数;
  jobs: 0,

  formats: {
    327680: '标清版',
    491520: '高清版',
    737280: '超清版',
  },
  videos: {
    327680: '',
    491520: '',
    737280: '',
  },

  run: function() {
    log('run() --');
    this.router();
  },
  
  /**
   * router control
   */
  router: function() {
    var url = uw.location.href;

    if (url.search('subject/play/') > 1 ||
        url.search('/vplay/') > 1 ) {
      this.getVid();
    } else if (url.search('subject/') > 1) {
      this.addLinks();
    } else if (url.search('uvideo/play/') > 1) {
      this.getUGCID();
    } else {
      error('Error: current page is not supported!');
    }
  },

  /**
   * Get UGC video ID.
   * For uvideo/play/'.
   */
  getUGCID: function() {
    log('getUGCID() --');
    var urlReg = /uvideo\/play\/(\d+)$/,
        urlMatch = urlReg.exec(uw.location.href);

    log('urlMatch: ', urlMatch);
    if (urlMatch.length === 2) {
      this.mediaid = urlMatch[1];
      this.getUGCVideoInfo();
    } else {
      error('Failed to parse video ID!');
    }
  },

  getUGCVideoInfo: function() {
    log('getUGCVideoInfo() --');
    var url = 'http://api.funshion.com/ajax/get_media_data/ugc/' + this.mediaid,
        that = this;

    log('url: ', url);
    GM_xmlhttpRequest({
      url: url,
      method: 'GET',
      onload: function(response) {
        log('response: ', response);
        that.json = JSON.parse(response.responseText);
        log('json: ', that.json);
        that.decodeUGCVideoInfo();
      },
    });
  },

  decodeUGCVideoInfo: function() {
    log('decodeUGCVideoInfo() --');
    var url = [
          'http://jobsfe.funshion.com/query/v1/mp4/',
          this.json.data.hashid,
          '.json?file=',
          this.json.data.filename,
        ].join(''),
        that = this;

    log('url: ', url);
    GM_xmlhttpRequest({
      url: url,
      method: 'GET',
      onload: function(response) {
        log('response: ', response);
        that.appendUGCVideo(JSON.parse(response.responseText));
      },
    });
  },

  appendUGCVideo: function(videoJson) {
    log('appendUGCVideo() --');
    log('this: ', this);
    log('videoJson:', videoJson);
    var fileformat = this.fileformats[videoJson.playlist[0].bits];

    info = {
      title: this.json.data.name_cn,
      href: videoJson.playlist[0].urls[0],
    };
    log('info: ', info);

    this._appendVideo(info);
  },


  /**
   * Get video ID.
   * For subject/play/'.
   */
  getVid: function() {
    log('getVid() --');
    var url = uw.location.href,
        urlReg = /subject\/play\/(\d+)\/(\d+)$/,
        urlMatch = urlReg.exec(url),
        urlReg2 = /\/vplay\/m-(\d+)/,
        urlMatch2 = urlReg2.exec(url);

    log('urlMatch: ', urlMatch);
    log('urlMatch2: ', urlMatch2);
    if (urlMatch && urlMatch.length === 3) {
      this.mediaid = urlMatch[1];
      this.number = parseInt(urlMatch[2]);
    } else if (urlMatch2 && urlMatch2.length === 2) {
      this.mediaid = urlMatch2[1];
      this.number = 1;
    } else {
      error('Failed to parse video ID!');
      return;
    }
    this.getVideoInfo();
  },

  /**
   * Download a json file containing video info
   */
  getVideoInfo: function() {
    log('getVideoInfo() --');
    var url = [
          'http://api.funshion.com/ajax/get_web_fsp/',
          this.mediaid,
          '/mp4',
        ].join(''),
        that = this;

    log('url: ', url);
    GM_xmlhttpRequest({
      url: url,
      method: 'GET',
      onload: function(response) {
        log('response: ', response);
        var json = JSON.parse(response.responseText),
            format;
        log('json: ', json);
        that.title = json.data.name_cn;
        if ((! json.data.fsps) || (! json.data.fsps.mult) ||
            (json.data.fsps.mult.length === 0) ||
            (! json.data.fsps.mult[0].cid)) {
          that.createUI();
        }

        that.mediaid = json.data.fsps.mult[0].cid;
        for (format in that.formats) {
          that.jobs = that.jobs + 1;
          that.getVideoLink(format);
        }
      },
    });
  },

  /**
   * Get Video source link.
   */
  getVideoLink: function(format) {
    log('getVideoLink() --');
    var url = [
      'http://jobsfe.funshion.com/query/v1/mp4/',
      this.mediaid,
      '.json?bits=',
      format,
      ].join(''),
      that = this;

    log('url: ', url);
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: function(response) {
        log('response: ', response);
        var json = JSON.parse(response.responseText);
        log('json: ', json);
        that.videos[format] = json.playlist[0].urls[0];
        that.jobs = that.jobs - 1;
        if (that.jobs === 0) {
          that.createUI();
        }
      },
    });
  },

  createUI: function() {
    log('createUI() --');
    log(this);
    var videos = {
          title: this.title,
          formats: [],
          links: [],
          ok: true,
          msg: '',
        },
        format;

    for (format in this.formats) {
      if (this.videos[format].length > 0) {
        videos.formats.push(this.formats[format]);
        videos.links.push(this.videos[format]);
      }
    }
    if (videos.links.length === 0) {
      videos.ok = false;
      videos.msg = 'Video source is not available.';
    }
    singleFile.run(videos);
  },
}

monkey.run();

