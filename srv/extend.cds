using bookshop from '../db/schema';
using from './main';

extend bookshop.Books with {
  authors: Association to many Books_Authors on authors.book = $self;
  publisher: Association to bookshop.Publishers;
}

extend bookshop.Authors with {
  books: Association to many Books_Authors on books.author = $self;
}

extend bookshop.Publishers with {
  books: Association to many bookshop.Books on books.publisher = $self;
}

entity Books_Authors {
    key ID: Integer;
    book: Association to bookshop.Books;
    author: Association to bookshop.Authors;
}

extend service Z with {
    entity LinkEntity as projection on Books_Authors;
    entity Publisher as projection on bookshop.Publishers;
}