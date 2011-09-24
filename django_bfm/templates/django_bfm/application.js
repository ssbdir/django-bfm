(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  $(function() {
    var BFMChildDirectoriesView, BFMDialog, BFMDirectories, BFMDirectoriesView, BFMDirectoryView, BFMFile, BFMFileTableView, BFMFileUploadView, BFMFileView, BFMFiles, BFMUploaderView, BFMUrls, D, Dirs, Files, Route, Table, Uploader, readable_size;
    readable_size = function(size) {
      var s, table, _i, _len;
      table = [['B', 1024, 0], ['KB', 1048576, 0], ['MB', 1073741824, 1], ['GB', 1099511627776, 2], ['TB', 1125899906842624, 3]];
      for (_i = 0, _len = table.length; _i < _len; _i++) {
        s = table[_i];
        if (size < s[1]) {
          return "" + ((size / (s[1] / 1024)).toFixed(s[2])) + " " + s[0];
        }
      }
    };
    BFMFile = Backbone.Model.extend({
      initialize: function() {
        this.set({
          'date': new Date(this.get('date'))
        });
        return this.set({
          'pdate': this.parseDate(),
          'psize': this.parseSize()
        });
      },
      delete_file: function() {
        return $.ajax({
          url: this.url,
          data: {
            action: 'delete',
            file: this.get('filename'),
            directory: this.get('rel_dir')
          }
        });
      },
      rename_file: function() {
        var dialog;
        dialog = new BFMDialog({
          url: this.url,
          model: this,
          template: '#fileRenameTemplate',
          callback: this.rename_file_callback
        });
        return dialog.render();
      },
      rename_file_callback: function(dialog_data) {
        $.ajax({
          url: this.url,
          data: "" + dialog_data + "&action=rename"
        });
        return Route.do_browse(Route.path);
      },
      touch_file: function() {
        $.ajax({
          url: this.url,
          data: {
            action: 'touch',
            file: this.get('filename'),
            directory: this.get('rel_dir')
          }
        });
        return Route.do_browse(Route.path);
      },
      url: 'file/',
      parseDate: function() {
        var d;
        d = this.get("date");
        return "" + (d.getFullYear()) + "-" + (d.getMonth()) + "-" + (d.getDate());
      },
      parseSize: function() {
        return readable_size(this.get('size'));
      }
    });
    BFMFiles = Backbone.Collection.extend({
      url: 'list_files/',
      initialize: function(attrs) {
        this.base_url = this.url;
        this.bind('reset', this.added);
        if ((attrs != null) && (attrs.directory != null)) {
          return this.url = this.url + '?directory=' + attrs.directory;
        }
      },
      set_directory: function(directory) {
        return this.url = this.base_url + '?directory=' + directory;
      },
      comparator: function(model) {
        var date, dh, dt;
        date = model.get('date');
        dt = date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate();
        dh = date.getHours() * 100 + date.getMinutes();
        return -(dt + dh * 0.0001);
      },
      comparators: {
        date: {
          desc: function(model) {
            return 0 - model.get('date');
          },
          asc: function(model) {
            return model.get('date') - 0;
          }
        },
        size: {
          desc: function(model) {
            return -model.get('size');
          },
          asc: function(model) {
            return model.get('size');
          }
        },
        filename: {
          desc: function(model) {
            var str;
            str = model.get("filename");
            str = str.toLowerCase().split("");
            return _.map(str, function(letter) {
              return String.fromCharCode(-(letter.charCodeAt(0)));
            });
          },
          asc: function(model) {
            return model.get("filename");
          }
        },
        mime: {
          desc: function(model) {
            var str;
            str = model.get("mimetype");
            str = str.toLowerCase().split("");
            return _.map(str, function(letter) {
              return String.fromCharCode(-(letter.charCodeAt(0)));
            });
          },
          asc: function(model) {
            return model.get('mimetype');
          }
        }
      },
      model: BFMFile,
      added: function() {
        return _.forEach(this.models, function(model) {
          return new BFMFileView({
            'model': model
          }).render();
        });
      }
    });
    BFMDirectories = Backbone.Collection.extend({
      url: 'list_directories/',
      initialize: function(attrs) {
        return this.bind('reset', this.added);
      },
      added: function() {
        return _.forEach(this.models, function(model) {
          return new BFMDirectoryView({
            'model': model.attributes
          }).render();
        });
      }
    });
    BFMFileTableView = Backbone.View.extend({
      el: $('#result_list'),
      current_row: 1,
      ord: ['date', true],
      events: {
        'click th': 'resort_data'
      },
      resort_data: function(e) {
        var name;
        name = e.currentTarget.getAttribute('data-name');
        if (!Files.comparators[name]) {
          return false;
        }
        if (this.ord[0] === name) {
          this.ord[1] = !this.ord[1];
        } else {
          this.ord = [name, true];
        }
        this.clear();
        if (this.ord[1]) {
          Files.comparator = Files.comparators[name].desc;
        } else {
          Files.comparator = Files.comparators[name].asc;
        }
        return Files.sort();
      },
      clear: function() {
        this.current_row = 1;
        this.el.html('');
        this.append($('<thead/>').append($('<tr/>')));
        return this.draw_head();
      },
      append: function(element) {
        return this.el.append(element);
      },
      prepend: function(element) {
        return this.el.prepend(element);
      },
      draw_head: function() {
        var c;
        c = {};
        c[this.ord[0]] = "" + (this.ord[1] ? 'descending' : 'ascending') + " sorted";
        return this.el.find('tr:first').append($('#fileBrowseHeadTemplate').tmpl(c));
      },
      get_row_class: function() {
        this.current_row = (this.current_row + 1) % 2;
        return "row" + (this.current_row + 1);
      }
    });
    BFMDirectoriesView = Backbone.View.extend({
      el: $('.directory-list'),
      append: function(elm) {
        return this.el.append(elm);
      }
    });
    BFMDirectoryView = Backbone.View.extend({
      tagName: 'li',
      events: {
        "click .directory": "load_directory"
      },
      load_directory: function(e) {
        e.stopImmediatePropagation();
        Route.goto(this.model.rel_dir);
        return this.el.children('a').addClass('selected');
      },
      initialize: function(attrs) {
        this.model = attrs.model;
        return this.el = $(this.el);
      },
      render: function() {
        return Dirs.append(this.srender());
      },
      srender: function() {
        var child;
        this.el.html("<a class='directory" + (Route.path === this.model.rel_dir ? " selected" : "") + "'>" + this.model.name + "</a>");
        if (this.model.childs != null) {
          child = new BFMChildDirectoriesView({
            'childs': this.model.childs,
            'parent': this
          });
          child.render();
        }
        return this.el;
      },
      append: function(element) {
        return this.el.append(element);
      }
    });
    BFMChildDirectoriesView = Backbone.View.extend({
      tagName: 'ul',
      initialize: function(attrs) {
        this.el = $(this.el);
        this.childs = attrs.childs;
        return this.parent = attrs.parent;
      },
      render: function() {
        var callback;
        callback = function(child) {
          var directory;
          directory = new BFMDirectoryView({
            'model': child
          });
          return this.parent.append(this.el.append(directory.srender()));
        };
        return _.forEach(this.childs, callback, this);
      }
    });
    BFMDialog = Backbone.View.extend({
      tagName: 'form',
      className: 'dialog',
      events: {
        "click .submit": 'call_callback',
        "click .cancel": 'cancel'
      },
      tear_down: function() {
        $(this.el).fadeOut(200, __bind(function() {
          return this.remove();
        }, this));
        return $('.block').css('display', 'none');
      },
      cancel: function(e) {
        this.tear_down();
        return e.preventDefault();
      },
      call_callback: function(e) {
        this.tear_down();
        e.preventDefault();
        return this.callback($(this.el).serialize());
      },
      initialize: function(attrs) {
        this.url = attrs.url;
        this.model = attrs.model;
        this.template = attrs.template;
        return this.callback = attrs.callback;
      },
      render: function() {
        var element;
        element = $(this.el).html($(this.template).tmpl(this.model.attributes));
        $('body').append(element.fadeIn(200));
        return $('.block').css('display', 'block');
      }
    });
    BFMFileView = Backbone.View.extend({
      tagName: 'tr',
      events: {
        "click .delete": 'delete',
        "click .touch": 'touch',
        "click .rename": 'rename'
      },
      "delete": function(e) {
        this.model.delete_file();
        return this.remove();
      },
      touch: function(e) {
        return this.model.touch_file();
      },
      rename: function(e) {
        return this.model.rename_file();
      },
      className: function() {
        return Table.get_row_class();
      },
      initialize: function(attrs) {
        this.table = Table;
        this.attrs = attrs.model.attributes;
        return this.model = attrs.model;
      },
      render: function() {
        var elm;
        elm = $(this.el).html($('#fileBrowseTemplate').tmpl(this.attrs));
        if (this.attrs.mimetype.substring(0, 5) === "image") {
          elm.find('.icons .resize').css('display', 'block');
        }
        return this.table.append(elm);
      }
    });
    BFMFileUploadView = Backbone.View.extend({
      initialize: function(file, parent) {
        this.file = file;
        this.parent = parent;
        return this.directory = Route.path;
      },
      events: {
        'click a': 'abort'
      },
      renders: function() {
        this.el = $('#UploadableTemplate').tmpl({
          'filename': this.file.fileName
        });
        this.delegateEvents(this.events);
        return this.el;
      },
      abort: function() {
        this.xhr.abort();
        this.el.find('.progress').css('background', '#FF6600');
        return this.upload_complete();
      },
      fail: function() {
        this.el.find('.progress').css('background', '#CC0000');
        this.parent.report_errors();
        return this.upload_complete();
      },
      do_upload: function() {
        var csrf_token, form, xhr;
        this.xhr = xhr = new XMLHttpRequest();
        form = new FormData();
        csrf_token = $('input[name=csrfmiddlewaretoken]').val();
        form.append("file", this.file);
        xhr.upload.addEventListener("progress", (__bind(function(e) {
          return this.report_progress(e);
        }, this)), false);
        xhr.addEventListener("load", (__bind(function(e) {
          return this.upload_complete(e);
        }, this)), false);
        xhr.addEventListener("error", (__bind(function() {
          return this.fail();
        }, this)), false);
        this.stats = {
          start: new Date(),
          last_report: new Date(),
          last_loaded: 0
        };
        xhr.open("POST", "upfile/?directory=" + this.directory);
        xhr.setRequestHeader("X-CSRFToken", csrf_token);
        return xhr.send(form);
      },
      report_progress: function(e) {
        var last_loaded, last_report, percentage, size_difference, speed, time_difference;
        last_report = this.stats.last_report;
        last_loaded = this.stats.last_loaded;
        time_difference = new Date() - last_report;
        size_difference = e.loaded - last_loaded;
        percentage = (e.loaded * 100 / this.file.size).toFixed(1);
        speed = ~~((size_difference * 1000 / time_difference) + 0.5);
        this.parent.report_speed(speed);
        if (percentage > 100) {
          percentage = 100;
        }
        this.el.find('.progress').stop(true).animate({
          width: "" + percentage + "%"
        }, Math.min(1000 / (speed / 1048576), 1000));
        if (time_difference > 3000) {
          this.stats.last_report = new Date();
          return this.stats.last_loaded = e.loaded;
        }
      },
      upload_complete: function(e) {
        this.parent.upload_next();
        return this.el.find('.stop').remove();
      }
    });
    BFMUploaderView = Backbone.View.extend({
      initialize: function() {
        this.uploadlist = [];
        return this.errors = false;
      },
      el: $('.uploader'),
      events: {
        'change form input': 'selected'
      },
      uploadingevents: {
        'click .minimize': 'minimize',
        'click .maximize': 'maximize',
        'click .refresh': 'karakiri'
      },
      minimize: function(e) {
        this.el.addClass('minimized');
        return $(e.currentTarget).removeClass('minimize').addClass('maximize');
      },
      maximize: function(e) {
        this.el.removeClass('minimized');
        return $(e.currentTarget).removeClass('maximize').addClass('minimize');
      },
      karakiri: function(e) {
        var Uploader;
        Uploader = new BFMUploaderView();
        return Uploader.render(this.el);
      },
      render: function(elm) {
        this.el.html($('#startUploadTemplate').tmpl());
        if (elm != null) {
          return elm.replaceWith(this.el);
        }
      },
      selected: function(e) {
        var file, selected_files, table, tmpl, uploadable, _i, _j, _len, _len2, _ref;
        tmpl = $('#UploadablesTemplate').tmpl();
        this.el.replaceWith(tmpl);
        this.el = tmpl;
        this.delegateEvents(this.uploadingevents);
        table = tmpl.find('table');
        selected_files = e.currentTarget.files;
        for (_i = 0, _len = selected_files.length; _i < _len; _i++) {
          file = selected_files[_i];
          this.uploadlist.push(new BFMFileUploadView(file, this));
        }
        _ref = this.uploadlist;
        for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
          uploadable = _ref[_j];
          table.append(uploadable.renders());
        }
        this.uploadlist.reverse();
        return this.uploadlist.pop().do_upload();
      },
      upload_next: function() {
        var text;
        if (this.uploadlist && this.uploadlist.length > 0) {
          return this.uploadlist.pop().do_upload();
        } else {
          text = "Upload was completed " + (!this.errors ? 'successfully.' : ', but with errors.');
          this.el.find('.status').text(text);
          this.el.filter('.uploadinghead').find('.icon').removeClass('minimize maximize').addClass('refresh');
          return Route.do_browse(Route.path);
        }
      },
      report_speed: function(speed) {
        return this.el.find('.status .speed').text("" + (readable_size(speed)) + "/s");
      },
      report_errors: function() {
        return this.errors = true;
      }
    });
    BFMUrls = Backbone.Router.extend({
      routes: {
        '*path': 'do_browse'
      },
      do_browse: function(path) {
        this.path = path;
        Dirs.el.find('.selected').removeClass('selected');
        Table.clear();
        Files.set_directory(path);
        return Files.fetch();
      },
      goto: function(path) {
        return this.navigate("" + path, true);
      }
    });
    Table = new BFMFileTableView();
    Dirs = new BFMDirectoriesView();
    Uploader = new BFMUploaderView();
    Files = new BFMFiles();
    D = new BFMDirectories;
    Route = new BFMUrls();
    D.fetch();
    Uploader.render();
    return Backbone.history.start();
  });
}).call(this);
