# -*- encoding: utf-8 -*-

Gem::Specification.new do |s|
  s.name = %q{gadgeteer}
  s.version = "0.2.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0") if s.respond_to? :required_rubygems_version=
  s.authors = ["Laszlo Bacsi"]
  s.date = %q{2009-02-19}
  s.default_executable = %q{gadgeteer}
  s.description = %q{Making it easy to develop OpenSocial gadgets with Rails or Sinatra.}
  s.email = %q{bacsi.laszlo@virgo.hu}
  s.executables = ["gadgeteer"]
  s.files = ["lib/gadgeteer.rb", "lib/sinatra/gadgeteer.rb", "bin/gadgeteer", "LICENSE", "Rakefile", "README.rdoc", "VERSION.yml", "test/gadgeteer_test.rb", "test/test_helper.rb", "templates/canvas.haml", "templates/gadget.haml", "templates/gadget.js", "templates/gadget.rb", "templates/gadget.yml", "templates/gadgets_controller.rb", "javascripts/jquery.gadgeteer.js", "javascripts/jquery.livequery.js", "javascripts/opensocial-jquery.js", "rails/init.rb"]
  s.has_rdoc = true
  s.homepage = %q{http://github.com/virgo/gadgeteer}
  s.rdoc_options = ["--inline-source", "--charset=UTF-8"]
  s.require_paths = ["lib"]
  s.rubygems_version = %q{1.3.1}
  s.summary = %q{Making it easy to develop OpenSocial gadgets with Rails or Sinatra.}

  if s.respond_to? :specification_version then
    current_version = Gem::Specification::CURRENT_SPECIFICATION_VERSION
    s.specification_version = 2

    if Gem::Version.new(Gem::RubyGemsVersion) >= Gem::Version.new('1.2.0') then
    else
    end
  else
  end
end
