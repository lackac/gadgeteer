require File.join(File.dirname(__FILE__), '..', 'gadgeteer')

Sinatra::Base.send :include, Gadgeteer
